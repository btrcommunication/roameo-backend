const pool = require("../config/db");

class RewardTier {
    static async findAll() {
        const [rows] = await pool.query(
            `SELECT id, tier_name, tier_level, min_earnings, min_bookings, benefits, created_at, updated_at
             FROM reward_tiers
             ORDER BY tier_level ASC`
        );
        return rows;
    }

    static async update(id, tierData) {
        const { tier_name, min_earnings, min_bookings, benefits } = tierData;
        const benefitsJson = JSON.stringify(benefits);
        
        await pool.query(
            `UPDATE reward_tiers 
             SET tier_name = ?, min_earnings = ?, min_bookings = ?, benefits = ?
             WHERE id = ?`,
            [tier_name, min_earnings, min_bookings, benefitsJson, id]
        );
        
        const [rows] = await pool.query(
            `SELECT id, tier_name, tier_level, min_earnings, min_bookings, benefits, created_at, updated_at
             FROM reward_tiers
             WHERE id = ?`,
            [id]
        );
        return rows[0] || null;
    }
}

module.exports = RewardTier;
