const pool = require("../config/db");

class Coupon {
    static normalizeBoolean(value, defaultValue = 0) {
        if (value === undefined || value === null || value === "") {
            return defaultValue;
        }

        return value === true ||
            value === 1 ||
            value === "1" ||
            value === "true"
            ? 1
            : 0;
    }

    static updateValue(value) {
        return value === undefined ? null : value;
    }

    static validationError(message) {
        const error = new Error(message);
        error.status = 400;
        return error;
    }

    static parseDate(value, fieldName) {
        if (
            value === undefined ||
            value === null ||
            String(value).trim() === ""
        ) {
            throw Coupon.validationError(`${fieldName} is required`);
        }

        const date = value instanceof Date
            ? new Date(value.getTime())
            : new Date(value);

        if (Number.isNaN(date.getTime())) {
            throw Coupon.validationError(`${fieldName} is invalid`);
        }

        return date;
    }

    static validateDates(validFrom, validUntil) {
        const start = Coupon.parseDate(validFrom, "Valid From");
        const end = Coupon.parseDate(validUntil, "Valid Until");

        if (end < start) {
            throw Coupon.validationError(
                "Valid Until must be on or after Valid From"
            );
        }

        return { start, end };
    }

    static parseMaxQuantity(value = 1) {
        const quantity = Number(value);

        if (
            !Number.isInteger(quantity) ||
            quantity < 1 ||
            quantity > 5
        ) {
            throw Coupon.validationError(
                "Maximum quantity must be a whole number between 1 and 5"
            );
        }

        return quantity;
    }

    // Validate and normalize the single coupon price.
    static parsePrice(value) {
        if (
            typeof value !== "string" &&
            typeof value !== "number"
        ) {
            throw Coupon.validationError("Price is required");
        }

        const text = String(value).trim();

        if (!/^\d{1,8}(\.\d{1,2})?$/.test(text)) {
            throw Coupon.validationError(
                "Price must be between 0 and 99999999.99, with up to 2 decimal places"
            );
        }

        const [whole, fraction = ""] = text.split(".");

        return (
            String(Number(whole)) +
            "." +
            fraction.padEnd(2, "0")
        );
    }

    static selectQuery() {
        return `
            SELECT
                c.id,
                c.title,
                c.subtitle,
                c.description,
                c.banner_image_url,
                c.banner_image_url AS banner_image,
                c.vendor_id,
                v.name AS vendor_name,
                v.email AS vendor_email,
                c.category_id,
                cat.category_name,
                c.valid_from,
                c.valid_until,
                c.valid_until AS expiry,
                c.price,
                c.max_quantity,
                c.priority,
                c.campaign_type,
                c.is_active,
                c.is_approved,
                c.disapproval_reason,
                c.created_at,
                c.updated_at,
                c.city
            FROM coupons c
            LEFT JOIN vendors v ON v.id = c.vendor_id
            LEFT JOIN categories cat ON cat.id = c.category_id
        `;
    }

    static async findAll(filters = {}) {
        let query = `${Coupon.selectQuery()} WHERE 1 = 1`;
        const params = [];

        if (
            filters.is_active !== undefined &&
            filters.is_active !== null
        ) {
            query += " AND c.is_active = ?";
            params.push(filters.is_active);
        }

        if (
            filters.is_approved !== undefined &&
            filters.is_approved !== null
        ) {
            query += " AND c.is_approved = ?";
            params.push(filters.is_approved);
        }

        if (filters.search) {
            query += `
                AND (
                    c.title LIKE ?
                    OR c.subtitle LIKE ?
                    OR v.name LIKE ?
                )
            `;

            const searchValue = `%${filters.search}%`;
            params.push(searchValue, searchValue, searchValue);
        }

        if (filters.vendor_id) {
            query += " AND c.vendor_id = ?";
            params.push(filters.vendor_id);
        }

        if (filters.category_id) {
            query += " AND c.category_id = ?";
            params.push(filters.category_id);
        }

        if (filters.city) {
            query += `
                AND (
                    c.city = ?
                    OR c.city = ''
                    OR c.city IS NULL
                )
            `;

            params.push(filters.city);
        }

        query += " ORDER BY c.priority DESC, c.created_at DESC";

        if (filters.limit) {
            const limit = Number(filters.limit);

            if (Number.isInteger(limit) && limit > 0) {
                query += " LIMIT ?";
                params.push(limit);
            }
        }

        const [rows] = await pool.query(query, params);
        return rows;
    }

    static async findById(id) {
        const [rows] = await pool.query(
            `${Coupon.selectQuery()} WHERE c.id = ?`,
            [id]
        );

        return rows[0] || null;
    }

    static async findActive({ city = null, limit = 20 } = {}) {
        const parsedLimit = Number(limit);

        const safeLimit =
            Number.isInteger(parsedLimit) && parsedLimit > 0
                ? parsedLimit
                : 20;

        const [rows] = await pool.query(
            `
                ${Coupon.selectQuery()}
                WHERE c.is_active = 1
                  AND c.is_approved = 1
                  AND c.valid_from <= NOW()
                  AND c.valid_until >= NOW()
                  AND (
                      ? IS NULL
                      OR c.city = ?
                      OR c.city = ''
                      OR c.city IS NULL
                  )
                ORDER BY c.priority DESC, c.valid_until ASC
                LIMIT ?
            `,
            [city, city, safeLimit]
        );

        return rows.map((coupon) => ({
            ...coupon,
            max_quantity: Number(coupon.max_quantity || 1),
            vendor: coupon.vendor_id
                ? {
                      id: coupon.vendor_id,
                      name: coupon.vendor_name,
                  }
                : null,
        }));
    }

    static async create(couponData) {
        const {
            title,
            subtitle,
            description,
            banner_image,
            vendor_id,
            category_id,
            valid_from,
            valid_until,
            price,
            max_quantity = 1,
            priority = 0,
            campaign_type,
            city,
            is_active = 1,
            is_approved = 0,
        } = couponData;

        if (typeof title !== "string" || !title.trim()) {
            throw Coupon.validationError("Coupon title is required");
        }

        const { start, end } = Coupon.validateDates(
            valid_from,
            valid_until
        );

        const parsedMaxQuantity = Coupon.parseMaxQuantity(max_quantity);
        const parsedPrice = Coupon.parsePrice(price);

        const [result] = await pool.query(
            `
                INSERT INTO coupons (
                    title,
                    subtitle,
                    description,
                    banner_image_url,
                    coupon_code,
                    vendor_id,
                    category_id,
                    valid_from,
                    valid_until,
                    price,
                    max_quantity,
                    priority,
                    campaign_type,
                    city,
                    is_active,
                    is_approved
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                title.trim(),
                subtitle || null,
                description || null,
                banner_image || null,
                null,
                vendor_id || null,
                category_id || null,
                start,
                end,
                parsedPrice,
                parsedMaxQuantity,
                Number(priority || 0),
                campaign_type || "coupon",
                city || null,
                Coupon.normalizeBoolean(is_active, 1),
                Coupon.normalizeBoolean(is_approved, 0),
            ]
        );

        const newCouponId = result.insertId;
        const randomStr = Math.floor(1000 + Math.random() * 9000);
        const generatedCode = `ROA-${newCouponId}-${randomStr}`;
        
        await pool.query("UPDATE coupons SET coupon_code = ? WHERE id = ?", [generatedCode, newCouponId]);

        return Coupon.findById(newCouponId);
    }

    static async update(id, couponData) {
        const existing = await Coupon.findById(id);
        if (!existing) return null;

        const {
            title,
            subtitle,
            description,
            banner_image,
            vendor_id,
            category_id,
            valid_from,
            valid_until,
            price,
            max_quantity,
            priority,
            campaign_type,
            city,
            is_active,
            is_approved,
            disapproval_reason,
        } = couponData;

        if (title !== undefined && !String(title).trim()) {
            throw Coupon.validationError("Coupon title cannot be empty");
        }

        const { start, end } = Coupon.validateDates(
            valid_from === undefined ? existing.valid_from : valid_from,
            valid_until === undefined ? existing.valid_until : valid_until
        );

        const parsedMaxQuantity =
            max_quantity === undefined
                ? null
                : Coupon.parseMaxQuantity(max_quantity);

        const parsedPrice =
            price === undefined
                ? null
                : Coupon.parsePrice(price);

        const activeValue =
            is_active === undefined
                ? null
                : Coupon.normalizeBoolean(is_active);

        const approvedValue =
            is_approved === undefined
                ? null
                : Coupon.normalizeBoolean(is_approved);

        await pool.query(
            `
                UPDATE coupons
                SET
                    title = COALESCE(?, title),
                    subtitle = COALESCE(?, subtitle),
                    description = COALESCE(?, description),
                    banner_image_url = COALESCE(?, banner_image_url),
                    coupon_code = NULL,
                    vendor_id = COALESCE(?, vendor_id),
                    category_id = COALESCE(?, category_id),
                    valid_from = COALESCE(?, valid_from),
                    valid_until = COALESCE(?, valid_until),
                    price = COALESCE(?, price),
                    max_quantity = COALESCE(?, max_quantity),
                    priority = COALESCE(?, priority),
                    campaign_type = COALESCE(?, campaign_type),
                    city = COALESCE(?, city),
                    is_active = COALESCE(?, is_active),
                    is_approved = COALESCE(?, is_approved),
                    disapproval_reason = COALESCE(?, disapproval_reason),
                    updated_at = NOW()
                WHERE id = ?
            `,
            [
                Coupon.updateValue(title),
                Coupon.updateValue(subtitle),
                Coupon.updateValue(description),
                Coupon.updateValue(banner_image),
                Coupon.updateValue(vendor_id),
                Coupon.updateValue(category_id),
                valid_from === undefined ? null : start,
                valid_until === undefined ? null : end,
                parsedPrice,
                parsedMaxQuantity,
                Coupon.updateValue(priority),
                Coupon.updateValue(campaign_type),
                Coupon.updateValue(city),
                activeValue,
                approvedValue,
                Coupon.updateValue(disapproval_reason),
                id,
            ]
        );

        return Coupon.findById(id);
    }

    static async delete(id) {
        const [result] = await pool.query(
            "DELETE FROM coupons WHERE id = ?",
            [id]
        );

        return result.affectedRows > 0;
    }

    static async getStats() {
        const [rows] = await pool.query(`
            SELECT
                COUNT(*) AS total,
                SUM(
                    CASE WHEN is_active = 1 AND is_approved = 1
                    THEN 1 ELSE 0 END
                ) AS active,
                SUM(
                    CASE WHEN is_active = 1 AND is_approved = 0
                    THEN 1 ELSE 0 END
                ) AS pending,
                SUM(
                    CASE WHEN is_active = 0
                    THEN 1 ELSE 0 END
                ) AS inactive,
                SUM(
                    CASE WHEN is_active = 1
                        AND is_approved = 1
                        AND valid_until < NOW()
                    THEN 1 ELSE 0 END
                ) AS expired
            FROM coupons
        `);

        return rows[0] || {
            total: 0,
            active: 0,
            pending: 0,
            inactive: 0,
            expired: 0,
        };
    }

    static async approve(id) {
        const randomStr = Math.floor(1000 + Math.random() * 9000);
        const generatedCode = `ROA-${id}-${randomStr}`;

        await pool.query(
            `
                UPDATE coupons
                SET
                    is_approved = 1,
                    is_active = 1,
                    coupon_code = COALESCE(coupon_code, ?),
                    disapproval_reason = NULL,
                    updated_at = NOW()
                WHERE id = ?
            `,
            [generatedCode, id]
        );

        return Coupon.findById(id);
    }

    static async disapprove(id, reason) {
        await pool.query(
            `
                UPDATE coupons
                SET
                    is_approved = 0,
                    is_active = 0,
                    disapproval_reason = ?,
                    updated_at = NOW()
                WHERE id = ?
            `,
            [reason, id]
        );

        return Coupon.findById(id);
    }
}

module.exports = Coupon;