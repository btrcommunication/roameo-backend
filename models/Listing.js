const pool = require("../config/db");

const toListingCard = (row) => {
    const originalPrice = Number(row.price || 0);
    const discountPercentage = Number(row.discount_percentage || 0);
    const finalPrice = discountPercentage > 0
        ? Number((originalPrice * (100 - discountPercentage) / 100).toFixed(2))
        : originalPrice;

    return {
        id: row.id,
        title: row.title,
        description: row.description,
        category: {
            id: row.category_id,
            name: row.category_name,
            level: row.category_level
        },
        city: row.city,
        district: row.district,
        thumbnail: row.thumbnail_url || row.image_url || null,
        vendor: {
            id: row.vendor_id,
            name: row.vendor_name,
            latitude: row.vendor_latitude,
            longitude: row.vendor_longitude
        },
        rating: Number(row.rating || 0),
        review_count: Number(row.review_count || 0),
        original_price: originalPrice,
        discount_percentage: discountPercentage,
        final_price: finalPrice,
        offer_label: row.offer_label,
        is_active: !!row.is_active,
        is_approved: !!row.is_approved,
        created_at: row.created_at,
        expiry: row.valid_until || null,
        distance: row.distance_meters != null ? Number((row.distance_meters / 1000).toFixed(2)) : null
    };
};

class Listing {
    static async getNewListings({ city = null, limit = 20 }) {
        const [rows] = await pool.query(
            `SELECT l.id, l.title, l.description, l.category_id, c.category_name, c.level AS category_level,
                    l.city, l.district, l.thumbnail_url, l.price, l.discount_percentage,
                    l.offer_label, l.rating, l.review_count, l.vendor_id, v.name AS vendor_name,
                    v.latitude AS vendor_latitude, v.longitude AS vendor_longitude,
                    l.is_active, l.is_approved, l.created_at
             FROM listings l
             LEFT JOIN categories c ON c.id = l.category_id
             LEFT JOIN vendors v ON v.id = l.vendor_id
             WHERE l.is_active = 1
               AND l.is_approved = 1
               AND ( ? IS NULL OR l.city = ? )
             ORDER BY l.created_at DESC
             LIMIT ?`,
            [city, city, Number(limit)]
        );
        return rows.map(toListingCard);
    }

    static async getDealsNearby({ city = null, latitude = null, longitude = null, sortBy = "nearest", limit = 20 }) {
        const baseSelect = `SELECT l.id, l.title, l.description, l.category_id, c.category_name, c.level AS category_level,
                l.city, l.district, l.thumbnail_url, l.price, l.discount_percentage,
                l.offer_label, l.rating, l.review_count, l.vendor_id, v.name AS vendor_name,
                v.latitude AS vendor_latitude, v.longitude AS vendor_longitude,
                v.service_radius_meters, l.is_active, l.is_approved, l.created_at,
                l.valid_until, `;

        const distanceExpression = latitude !== null && longitude !== null
            ? `6371000 * ACOS(LEAST(1, COS(RADIANS(?)) * COS(RADIANS(v.latitude)) * COS(RADIANS(v.longitude) - RADIANS(?)) + SIN(RADIANS(?)) * SIN(RADIANS(v.latitude))))`
            : "NULL";

        const orderClause = sortBy === "highest_discount"
            ? "l.discount_percentage DESC, l.valid_until ASC"
            : sortBy === "expiry"
                ? "l.valid_until ASC, l.discount_percentage DESC"
                : "distance_meters ASC, l.discount_percentage DESC";

        const query = `${baseSelect}
                ${distanceExpression} AS distance_meters
             FROM listings l
             LEFT JOIN categories c ON c.id = l.category_id
             LEFT JOIN vendors v ON v.id = l.vendor_id
             WHERE l.is_active = 1
               AND l.is_approved = 1
               AND ( ? IS NULL OR l.city = ? )
               AND (l.discount_percentage > 0 OR l.offer_label IS NOT NULL)
             ${latitude !== null && longitude !== null ? `
               AND (${distanceExpression}) <= COALESCE(v.service_radius_meters, 5000)` : ""}
             ORDER BY ${orderClause}
             LIMIT ?`;

        const params = latitude !== null && longitude !== null
            ? [latitude, longitude, latitude, city, city, latitude, longitude, latitude, Number(limit)]
            : [city, city, Number(limit)];

        const [rows] = await pool.query(query, params);
        return rows.map(toListingCard);
    }

    static async getPopularActivities({ city = null, limit = 20 }) {
        const [rows] = await pool.query(
            `SELECT l.id, l.title, l.description, l.category_id, c.category_name, c.level AS category_level,
                    l.city, l.district, l.thumbnail_url, l.price, l.discount_percentage,
                    l.offer_label, l.rating, l.review_count, l.vendor_id, v.name AS vendor_name,
                    v.latitude AS vendor_latitude, v.longitude AS vendor_longitude,
                    IFNULL(b.booking_count, 0) AS booking_count,
                    IFNULL(vw.view_count, 0) AS view_count,
                    IFNULL(wl.wishlist_count, 0) AS wishlist_count,
                    l.is_active, l.is_approved, l.created_at,
                    (IFNULL(b.booking_count, 0) * 0.5 + IFNULL(vw.view_count, 0) * 0.2 + IFNULL(wl.wishlist_count, 0) * 0.2 + l.rating * 2) AS popularity_score
             FROM listings l
             LEFT JOIN categories c ON c.id = l.category_id
             LEFT JOIN vendors v ON v.id = l.vendor_id
             LEFT JOIN (
                 SELECT listing_id, COUNT(*) AS booking_count
                 FROM booking_history
                 WHERE status IN ('confirmed', 'completed')
                 GROUP BY listing_id
             ) b ON b.listing_id = l.id
             LEFT JOIN (
                 SELECT listing_id, COUNT(*) AS view_count
                 FROM listing_views
                 GROUP BY listing_id
             ) vw ON vw.listing_id = l.id
             LEFT JOIN (
                 SELECT listing_id, COUNT(*) AS wishlist_count
                 FROM wishlist_items
                 GROUP BY listing_id
             ) wl ON wl.listing_id = l.id
             WHERE l.is_active = 1
               AND l.is_approved = 1
               AND ( ? IS NULL OR l.city = ? )
             ORDER BY popularity_score DESC, l.rating DESC, l.review_count DESC
             LIMIT ?`,
            [city, city, Number(limit)]
        );
        return rows.map(toListingCard);
    }

    static async getRecommendedByCategory({ city = null, categoryIds = [], limit = 20 }) {
        if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
            return [];
        }

        const [rows] = await pool.query(
            `SELECT l.id, l.title, l.description, l.category_id, c.category_name, c.level AS category_level,
                    l.city, l.district, l.thumbnail_url, l.price, l.discount_percentage,
                    l.offer_label, l.rating, l.review_count, l.vendor_id, v.name AS vendor_name,
                    v.latitude AS vendor_latitude, v.longitude AS vendor_longitude,
                    l.is_active, l.is_approved, l.created_at
             FROM listings l
             LEFT JOIN categories c ON c.id = l.category_id
             LEFT JOIN vendors v ON v.id = l.vendor_id
             WHERE l.is_active = 1
               AND l.is_approved = 1
               AND ( ? IS NULL OR l.city = ? )
               AND l.category_id IN (?)
             ORDER BY l.rating DESC, l.review_count DESC, l.created_at DESC
             LIMIT ?`,
            [city, city, categoryIds, Number(limit)]
        );
        return rows.map(toListingCard);
    }

    static async getTrendingByLocation({ city = null, limit = 20 }) {
        const [rows] = await pool.query(
            `SELECT l.id, l.title, l.description, l.category_id, c.category_name, c.level AS category_level,
                    l.city, l.district, l.thumbnail_url, l.price, l.discount_percentage,
                    l.offer_label, l.rating, l.review_count, l.vendor_id, v.name AS vendor_name,
                    v.latitude AS vendor_latitude, v.longitude AS vendor_longitude,
                    COUNT(lv.id) AS view_count,
                    l.is_active, l.is_approved, l.created_at
             FROM listings l
             LEFT JOIN categories c ON c.id = l.category_id
             LEFT JOIN vendors v ON v.id = l.vendor_id
             LEFT JOIN listing_views lv ON lv.listing_id = l.id
             WHERE l.is_active = 1
               AND l.is_approved = 1
               AND ( ? IS NULL OR l.city = ? )
             GROUP BY l.id
             ORDER BY view_count DESC, l.rating DESC, l.review_count DESC
             LIMIT ?`,
            [city, city, Number(limit)]
        );
        return rows.map(toListingCard);
    }

    static async create(data) {
        const {
            title,
            description,
            category_id,
            vendor_id,
            city,
            district,
            thumbnail_url,
            price,
            discount_percentage,
            offer_label,
            valid_until
        } = data;

        const [result] = await pool.query(
            `INSERT INTO listings
                (title, description, category_id, vendor_id, city, district, thumbnail_url, price, discount_percentage, offer_label, valid_until, is_active, is_approved)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)`,
            [
                title,
                description,
                category_id,
                vendor_id,
                city,
                district,
                thumbnail_url,
                price,
                discount_percentage,
                offer_label,
                valid_until || null
            ]
        );

        return {
            id: result.insertId,
            title,
            description,
            category: { id: category_id },
            vendor: { id: vendor_id },
            city,
            district,
            thumbnail_url: thumbnail_url,
            original_price: Number(price || 0),
            discount_percentage: Number(discount_percentage || 0),
            final_price: Number(price || 0) * (1 - Number(discount_percentage || 0) / 100),
            offer_label,
            is_active: true,
            is_approved: false,
            created_at: new Date().toISOString(),
            expiry: valid_until || null,
            rating: 0,
            review_count: 0
        };
    }

    static async getUserWishlistCategoryIds(userId) {
        const [rows] = await pool.query(
            `SELECT DISTINCT l.category_id
             FROM wishlist_items w
             JOIN listings l ON l.id = w.listing_id
             WHERE w.user_id = ?
               AND l.is_active = 1
               AND l.is_approved = 1`,
            [userId]
        );
        return rows.map((row) => row.category_id);
    }

    static async getUserRecentlyViewedCategoryIds(userId) {
        const [rows] = await pool.query(
            `SELECT l.category_id
             FROM listing_views v
             JOIN listings l ON l.id = v.listing_id
             WHERE v.user_id = ?
               AND l.is_active = 1
               AND l.is_approved = 1
             ORDER BY v.viewed_at DESC
             LIMIT 10`,
            [userId]
        );
        return rows.map(row => row.category_id);
    }

    static async findAllAdmin({ page = 1, limit = 10, category = null, vendor_id = null }) {
        const offset = (page - 1) * limit;
        let query = `
            SELECT l.id, l.title, c.category_name as category, l.price, l.description,
                   l.image_url, (SELECT COUNT(*) FROM booking_history b WHERE b.listing_id = l.id) as bookings,
                   l.rating, DATEDIFF(CURRENT_DATE, l.created_at) as created_days_ago,
                   v.id as vendor_id, v.name as vendor_name
            FROM listings l
            LEFT JOIN categories c ON l.category_id = c.id
            LEFT JOIN vendors v ON l.vendor_id = v.id
            WHERE l.is_active = 1
        `;
        const params = [];
        if (category) {
            query += ` AND c.category_name = ?`;
            params.push(category);
        }
        if (vendor_id) {
            query += ` AND l.vendor_id = ?`;
            params.push(vendor_id);
        }
        query += ` ORDER BY l.created_at DESC LIMIT ? OFFSET ?`;
        params.push(Number(limit), Number(offset));
        
        const [rows] = await pool.query(query, params);
        
        return rows.map(row => ({
            id: row.id,
            title: row.title,
            category: row.category,
            price: Number(row.price || 0),
            description: row.description,
            image_url: row.image_url,
            bookings: row.bookings,
            rating: Number(row.rating || 0),
            created_days_ago: row.created_days_ago,
            vendor: {
                id: row.vendor_id,
                name: row.vendor_name
            }
        }));
    }

    static async updateAdmin(id, updateData) {
        const { title, category_id, price, description, image_url } = updateData;
        const updates = [];
        const params = [];
        
        if (title !== undefined) { updates.push('title = ?'); params.push(title); }
        if (category_id !== undefined) { updates.push('category_id = ?'); params.push(category_id); }
        if (price !== undefined) { updates.push('price = ?'); params.push(price); }
        if (description !== undefined) { updates.push('description = ?'); params.push(description); }
        if (image_url !== undefined) { updates.push('image_url = ?'); params.push(image_url); }
        
        if (updates.length > 0) {
            params.push(id);
            await pool.query(
                `UPDATE listings SET ${updates.join(', ')} WHERE id = ?`,
                params
            );
        }
        
        const [rows] = await pool.query(
            `SELECT l.id, l.title, c.category_name as category, l.price, l.description, l.image_url, l.updated_at
             FROM listings l
             LEFT JOIN categories c ON l.category_id = c.id
             WHERE l.id = ?`,
            [id]
        );
        return rows[0] || null;
    }

    static async deleteAdmin(id) {
        // Soft delete
        await pool.query(`UPDATE listings SET is_active = 0 WHERE id = ?`, [id]);
        return { deleted_listing_id: id };
    }
}

module.exports = Listing;
