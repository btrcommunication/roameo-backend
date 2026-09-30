const pool = require("../config/db");

class Review {
    static async create(reviewData) {
        const { listing_id, user_id, rating, comment } = reviewData;
        const [result] = await pool.query(
            `INSERT INTO reviews (listing_id, user_id, rating, comment)
             VALUES (?, ?, ?, ?)`,
            [listing_id, user_id, rating, comment]
        );
        return {
            id: result.insertId,
            listing_id,
            user_id,
            rating,
            comment,
            created_at: new Date().toISOString()
        };
    }

    static async findByListingId(listing_id) {
        const [rows] = await pool.query(
            `SELECT r.id, r.rating, r.comment, r.admin_reply, r.created_at, u.name as username 
             FROM reviews r
             JOIN users u ON r.user_id = u.id
             WHERE r.listing_id = ?
             ORDER BY r.created_at DESC`,
            [listing_id]
        );
        return rows;
    }

    static async addAdminReply(review_id, reply_comment) {
        await pool.query(
            `UPDATE reviews 
             SET admin_reply = ?, replied_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [reply_comment, review_id]
        );
        
        const [rows] = await pool.query(
            `SELECT id, listing_id, rating, comment, admin_reply, replied_at
             FROM reviews
             WHERE id = ?`,
            [review_id]
        );
        return rows[0] || null;
    }
}

module.exports = Review;