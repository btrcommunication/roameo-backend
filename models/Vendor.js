const pool = require("../config/db");

class Vendor {
    static async findById(id) {
        const [rows] = await pool.query(
            `SELECT v.id, v.name, v.latitude, v.longitude, v.service_radius_meters, v.is_active, v.created_at,
                    v.email, v.phone, v.address, v.business_description, v.reward_points, v.tier_id,
                    t.tier_name as tier_status
             FROM vendors v
             LEFT JOIN reward_tiers t ON v.tier_id = t.id
             WHERE v.id = ?`,
            [id]
        );
        return rows[0] || null;
    }

    static async findByName(name) {
        const [rows] = await pool.query(
            `SELECT v.id, v.name, v.latitude, v.longitude, v.service_radius_meters, v.is_active, v.created_at,
                    v.email, v.phone, v.address, v.business_description, v.reward_points, v.tier_id
             FROM vendors v
             WHERE v.name = ?
             LIMIT 1`,
            [name]
        );
        return rows[0] || null;
    }

    static async create(vendorData) {
        const { name, latitude = null, longitude = null, service_radius_meters = 5000, email = null, phone = null, address = null, business_description = null } = vendorData;
        const [result] = await pool.query(
            `INSERT INTO vendors (name, latitude, longitude, service_radius_meters, email, phone, address, business_description)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, latitude, longitude, service_radius_meters, email, phone, address, business_description]
        );
        return {
            id: result.insertId,
            name,
            latitude,
            longitude,
            service_radius_meters,
            email,
            phone,
            address,
            business_description,
            is_active: 1,
            reward_points: 0,
            tier_id: null,
            created_at: new Date().toISOString()
        };
    }

    static async findAllWithMetrics() {
        const [rows] = await pool.query(`
            SELECT 
                v.id as vendor_id,
                v.name as business_name,
                v.email,
                v.phone,
                v.address,
                DATE(v.created_at) as joined_date,
                v.reward_points,
                t.tier_name as tier_status,
                (SELECT COUNT(*) FROM listings l WHERE l.vendor_id = v.id) as total_listings,
                (SELECT IFNULL(SUM(b.price), 0) FROM booking_history bh JOIN listings b ON bh.listing_id = b.id WHERE b.vendor_id = v.id AND bh.status='confirmed') as total_earnings,
                (SELECT COUNT(*) FROM booking_history bh JOIN listings b ON bh.listing_id = b.id WHERE b.vendor_id = v.id) as total_bookings,
                (SELECT IFNULL(AVG(r.rating), 0) FROM reviews r JOIN listings b ON r.listing_id = b.id WHERE b.vendor_id = v.id) as rating
            FROM vendors v
            LEFT JOIN reward_tiers t ON v.tier_id = t.id
        `);
        return rows;
    }

    static async updateProfile(id, vendorData) {
        const { business_name, phone, address, business_description } = vendorData;
        await pool.query(
            `UPDATE vendors 
             SET name = COALESCE(?, name), 
                 phone = COALESCE(?, phone), 
                 address = COALESCE(?, address), 
                 business_description = COALESCE(?, business_description)
             WHERE id = ?`,
            [business_name, phone, address, business_description, id]
        );
        return await this.findById(id);
    }

    static async adjustRewards(id, rewardData) {
        const { add_reward_points, manual_tier_override } = rewardData;
        
        let tier_id = null;
        if (manual_tier_override) {
            const [tiers] = await pool.query('SELECT id FROM reward_tiers WHERE tier_name = ?', [manual_tier_override]);
            if (tiers.length > 0) {
                tier_id = tiers[0].id;
            }
        }
        
        await pool.query(
            `UPDATE vendors 
             SET reward_points = reward_points + COALESCE(?, 0),
                 tier_id = COALESCE(?, tier_id)
             WHERE id = ?`,
            [add_reward_points || 0, tier_id, id]
        );
        
        return await this.findById(id);
    }
}

module.exports = Vendor;
