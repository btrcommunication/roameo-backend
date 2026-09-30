const router = require("express").Router();
const Coupon = require("../models/Coupon");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { sendCouponApprovedEmail, sendCouponRejectedEmail } = require("../services/emailService");

const PUBLIC_BASE_URL = (
    process.env.PUBLIC_BASE_URL ||
    "https://roameomobileapp.braventra.in"
).replace(/\/+$/, "");

const UPLOAD_DIR = path.resolve(__dirname, "../uploads/coupons");

// Convert stored image paths into backend URLs in API responses only.
const serializeCoupon = (coupon) => {
    if (!coupon) return coupon;

    const image = coupon.banner_image_url || coupon.banner_image;

    const imageUrl = !image
        ? null
        : /^https?:\/\//i.test(image)
          ? image
          : `${PUBLIC_BASE_URL}/${image.replace(/^\/+/, "")}`;

    return {
        ...coupon,
        banner_image: imageUrl,
        banner_image_url: imageUrl,
    };
};

// FILE UPLOAD

const storage = multer.diskStorage({
    destination(req, file, cb) {
        try {
            fs.mkdirSync(UPLOAD_DIR, { recursive: true });
            cb(null, UPLOAD_DIR);
        } catch (error) {
            cb(error);
        }
    },

    filename(req, file, cb) {
        const uniqueSuffix =
            Date.now() + "-" + Math.round(Math.random() * 1e9);

        const extension = path.extname(file.originalname).toLowerCase();

        cb(null, `coupon-${uniqueSuffix}${extension}`);
    },
});

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },

    fileFilter(req, file, cb) {
        if (file.mimetype.startsWith("image/")) {
            return cb(null, true);
        }

        const error = new Error("Only image files are allowed");
        error.status = 400;
        cb(error);
    },
});

const uploadBanner = (req, res, next) => {
    upload.single("banner_image")(req, res, (error) => {
        if (!error) return next();

        const tooLarge = error.code === "LIMIT_FILE_SIZE";

        return res.status(tooLarge ? 413 : 400).json({
            status: "error",
            message: tooLarge
                ? "Coupon image must be 5 MB or smaller"
                : error.message || "Image upload failed",
        });
    });
};

const removeUploadedFile = (file) => {
    if (!file?.path) return;

    try {
        const resolvedPath = path.resolve(file.path);

        if (path.dirname(resolvedPath) !== UPLOAD_DIR) return;

        if (fs.existsSync(resolvedPath)) {
            fs.unlinkSync(resolvedPath);
        }
    } catch (error) {
        console.error("Failed to remove uploaded file:", error);
    }
};

const removeStoredImage = (imagePath) => {
    if (
        typeof imagePath !== "string" ||
        !imagePath.startsWith("/uploads/coupons/")
    ) {
        return;
    }

    const filename = imagePath.slice("/uploads/coupons/".length);

    if (!filename || filename !== path.basename(filename)) return;

    removeUploadedFile({
        path: path.join(UPLOAD_DIR, filename),
    });
};

const sendError = (res, error, fallback) => {
    console.error(fallback, error);

    const status = error.status === 400 ? 400 : 500;

    return res.status(status).json({
        status: "error",
        message: status === 400 ? error.message : fallback,
    });
};

const optionalText = (value) => {
    if (value === undefined || value === null) return null;
    return String(value).trim() || null;
};

// GET ALL COUPONS

const getAllCoupons = async (req, res) => {
    try {
        const {
            search,
            is_active,
            is_approved,
            vendor_id,
            category_id,
            city,
            limit,
        } = req.query;

        const filters = {};

        if (search) filters.search = search;
        if (is_active !== undefined) filters.is_active = is_active;
        if (is_approved !== undefined) filters.is_approved = is_approved;
        if (vendor_id) filters.vendor_id = vendor_id;
        if (category_id) filters.category_id = category_id;
        if (city) filters.city = city;

        if (limit !== undefined) {
            const parsedLimit = Number(limit);

            if (Number.isInteger(parsedLimit) && parsedLimit > 0) {
                filters.limit = parsedLimit;
            }
        }

        const coupons = await Coupon.findAll(filters);

        return res.status(200).json({
            status: "success",
            data: coupons.map(serializeCoupon),
        });
    } catch (error) {
        return sendError(res, error, "Failed to fetch coupons");
    }
};

// GET SINGLE COUPON

const getCouponById = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);

        if (!coupon) {
            return res.status(404).json({
                status: "error",
                message: "Coupon not found",
            });
        }

        return res.status(200).json({
            status: "success",
            data: serializeCoupon(coupon),
        });
    } catch (error) {
        return sendError(res, error, "Failed to fetch coupon");
    }
};

// CREATE COUPON

const createCoupon = async (req, res) => {
    try {
        const body = req.body || {};

        if (typeof body.title !== "string" || !body.title.trim()) {
            throw Coupon.validationError("Coupon title is required");
        }

        const { start, end } = Coupon.validateDates(
            body.valid_from,
            body.valid_until
        );

        const maxQuantity = Coupon.parseMaxQuantity(
            body.max_quantity === undefined ||
            body.max_quantity === null ||
            String(body.max_quantity).trim() === ""
                ? 1
                : body.max_quantity
        );

        const coupon = await Coupon.create({
            title: body.title.trim(),
            subtitle: optionalText(body.subtitle),
            description: optionalText(body.description),

            banner_image: req.file
                ? `/uploads/coupons/${req.file.filename}`
                : null,

            vendor_id: body.vendor_id || null,
            category_id: body.category_id || null,

            valid_from: start,
            valid_until: end,

            price: Coupon.parsePrice(body.price),

            max_quantity: maxQuantity,
            priority: body.priority || 0,
            campaign_type: optionalText(body.campaign_type) || "coupon",
            city: optionalText(body.city),

            is_active:
                body.is_active !== undefined ? body.is_active : 1,

            is_approved:
                body.is_approved !== undefined ? body.is_approved : 0,
        });

        return res.status(201).json({
            status: "success",
            message: "Coupon created successfully",
            data: serializeCoupon(coupon),
        });
    } catch (error) {
        removeUploadedFile(req.file);
        return sendError(res, error, "Failed to create coupon");
    }
};

// UPDATE COUPON

const updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body || {};

        const existingCoupon = await Coupon.findById(id);

        if (!existingCoupon) {
            removeUploadedFile(req.file);

            return res.status(404).json({
                status: "error",
                message: "Coupon not found",
            });
        }

        if (
            body.title !== undefined &&
            !String(body.title ?? "").trim()
        ) {
            throw Coupon.validationError("Coupon title cannot be empty");
        }

        const { start, end } = Coupon.validateDates(
            body.valid_from !== undefined
                ? body.valid_from
                : existingCoupon.valid_from,

            body.valid_until !== undefined
                ? body.valid_until
                : existingCoupon.valid_until
        );

        const updateData = {};

        if (req.file) {
            updateData.banner_image =
                `/uploads/coupons/${req.file.filename}`;
        }

        if (body.title !== undefined) {
            updateData.title = String(body.title).trim();
        }

        if (body.subtitle !== undefined) {
            updateData.subtitle = optionalText(body.subtitle);
        }

        if (body.description !== undefined) {
            updateData.description = optionalText(body.description);
        }

        if (body.vendor_id !== undefined) {
            updateData.vendor_id = body.vendor_id || null;
        }

        if (body.category_id !== undefined) {
            updateData.category_id = body.category_id || null;
        }

        if (body.valid_from !== undefined) {
            updateData.valid_from = start;
        }

        if (body.valid_until !== undefined) {
            updateData.valid_until = end;
        }

        if (body.price !== undefined) {
            updateData.price = Coupon.parsePrice(body.price);
        }

        if (body.max_quantity !== undefined) {
            updateData.max_quantity = Coupon.parseMaxQuantity(
                body.max_quantity === null ||
                String(body.max_quantity).trim() === ""
                    ? 1
                    : body.max_quantity
            );
        }

        if (body.priority !== undefined) {
            updateData.priority = body.priority;
        }

        if (body.campaign_type !== undefined) {
            updateData.campaign_type = optionalText(body.campaign_type);
        }

        if (body.city !== undefined) {
            updateData.city = optionalText(body.city);
        }

        if (body.is_active !== undefined) {
            updateData.is_active = body.is_active;
        }

        if (body.is_approved !== undefined) {
            updateData.is_approved = body.is_approved;
        }

        if (body.disapproval_reason !== undefined) {
            updateData.disapproval_reason =
                optionalText(body.disapproval_reason);
        }

        const coupon = await Coupon.update(id, updateData);

        if (!coupon) {
            removeUploadedFile(req.file);

            return res.status(404).json({
                status: "error",
                message: "Coupon not found",
            });
        }

        if (req.file) {
            removeStoredImage(
                existingCoupon.banner_image_url ||
                existingCoupon.banner_image
            );
        }

        return res.status(200).json({
            status: "success",
            message: "Coupon updated successfully",
            data: serializeCoupon(coupon),
        });
    } catch (error) {
        removeUploadedFile(req.file);
        return sendError(res, error, "Failed to update coupon");
    }
};

// DELETE COUPON

const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const existingCoupon = await Coupon.findById(id);

        if (!existingCoupon) {
            return res.status(404).json({
                status: "error",
                message: "Coupon not found",
            });
        }

        const deleted = await Coupon.delete(id);

        if (!deleted) {
            return res.status(404).json({
                status: "error",
                message: "Coupon not found",
            });
        }

        removeStoredImage(
            existingCoupon.banner_image_url ||
            existingCoupon.banner_image
        );

        return res.status(200).json({
            status: "success",
            message: "Coupon deleted successfully",
        });
    } catch (error) {
        return sendError(res, error, "Failed to delete coupon");
    }
};

// APPROVE COUPON

const approveCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const existingCoupon = await Coupon.findById(id);

        if (!existingCoupon) {
            return res.status(404).json({
                status: "error",
                message: "Coupon not found",
            });
        }

        const coupon = await Coupon.approve(id);

        // Trigger Coupon Approved Email in background (non-blocking)
        if (coupon && coupon.vendor_email) {
            (async () => {
                try {
                    await sendCouponApprovedEmail(coupon.vendor_email, {
                        vendorName: coupon.vendor_name || "Vendor Partner",
                        couponId: coupon.id,
                        couponTitle: coupon.title,
                        couponCode: coupon.coupon_code || "",
                        discount: coupon.price ? `R${coupon.price}` : (coupon.subtitle || "Special Offer")
                    });
                } catch (mailErr) {
                    console.error(`[EmailService] Failed to send coupon approved email to ${coupon.vendor_email}:`, mailErr.message);
                }
            })();
        }

        return res.status(200).json({
            status: "success",
            message: "Coupon approved successfully",
            data: serializeCoupon(coupon),
        });
    } catch (error) {
        return sendError(res, error, "Failed to approve coupon");
    }
};

// DISAPPROVE COUPON

const disapproveCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const reason = optionalText(req.body?.reason);

        if (!reason) {
            return res.status(400).json({
                status: "error",
                message: "Disapproval reason is required",
            });
        }

        const existingCoupon = await Coupon.findById(id);

        if (!existingCoupon) {
            return res.status(404).json({
                status: "error",
                message: "Coupon not found",
            });
        }

        const coupon = await Coupon.disapprove(id, reason);

        // Trigger Coupon Rejected Email in background (non-blocking)
        if (coupon && coupon.vendor_email) {
            (async () => {
                try {
                    await sendCouponRejectedEmail(coupon.vendor_email, {
                        vendorName: coupon.vendor_name || "Vendor Partner",
                        couponId: coupon.id,
                        couponTitle: coupon.title,
                        couponCode: coupon.coupon_code || "",
                        discount: coupon.price ? `R${coupon.price}` : (coupon.subtitle || "Special Offer"),
                        submissionDate: coupon.created_at ? new Date(coupon.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
                        reason: coupon.disapproval_reason || reason,
                        supportEmail: process.env.SUPPORT_EMAIL || "roameo@btrcommunication.com"
                    });
                } catch (mailErr) {
                    console.error(`[EmailService] Failed to send coupon rejected email to ${coupon.vendor_email}:`, mailErr.message);
                }
            })();
        }

        return res.status(200).json({
            status: "success",
            message: "Coupon disapproved successfully",
            data: serializeCoupon(coupon),
        });
    } catch (error) {
        return sendError(res, error, "Failed to disapprove coupon");
    }
};

// STATISTICS

const getCouponStats = async (req, res) => {
    try {
        const stats = await Coupon.getStats();

        return res.status(200).json({
            status: "success",
            data: stats,
        });
    } catch (error) {
        return sendError(res, error, "Failed to fetch coupon statistics");
    }
};

// Existing endpoint paths are preserved.
// Preserve any admin authorization middleware used by your deployment
// on create, update, delete, approve, disapprove, and statistics routes.

router.get("/coupons", getAllCoupons);
router.get("/coupons/stats", getCouponStats);
router.get("/coupons/:id", getCouponById);

router.post("/coupons", uploadBanner, createCoupon);
router.put("/coupons/:id", uploadBanner, updateCoupon);
router.delete("/coupons/:id", deleteCoupon);
router.put("/coupons/:id/approve", approveCoupon);
router.put("/coupons/:id/disapprove", disapproveCoupon);

module.exports = router;