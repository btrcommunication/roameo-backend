const pool = require("../config/db");

class User {
    static async findByEmail(email) {
        const [rows] = await pool.query(
            `SELECT u.*, r.name AS role_name 
             FROM users u 
             JOIN roles r ON u.role_id = r.id 
             WHERE u.email = ?`,
            [email]
        );
        return rows[0];
    }

    static async findById(id) {
        const [rows] = await pool.query(
            `SELECT u.id, u.name, u.email, u.phone, 
                    u.address_line1, u.address_line2, 
                    u.city, u.district, u.pincode, u.country,
                    u.is_active, r.name AS role_name, u.created_at 
             FROM users u 
             JOIN roles r ON u.role_id = r.id 
             WHERE u.id = ?`,
            [id]
        );
        return rows[0];
    }

    static async getRoleByName(roleName) {
        const [rows] = await pool.query(
            "SELECT id, name FROM roles WHERE name = ?",
            [roleName]
        );
        return rows[0];
    }

    static async create(userData) {
        const {
            name, email, password, phone, role_id,
            address_line1, address_line2, city, district, pincode, country
        } = userData;

        const [result] = await pool.query(
            `INSERT INTO users 
                (name, email, password, phone, role_id, address_line1, address_line2, city, district, pincode, country)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name, email, password, phone, role_id,
                address_line1 || null, address_line2 || null, city || null, district || null, pincode || null, country || null
            ]
        );
        return result.insertId;
    }

    static async updateInfo(id, updateData) {
        const fields = [];
        const values = [];

        if (updateData.name) { fields.push("name = ?"); values.push(updateData.name); }
        if (updateData.email) { fields.push("email = ?"); values.push(updateData.email); }
        if (updateData.phone) { fields.push("phone = ?"); values.push(updateData.phone); }

        if (fields.length === 0) return 0;
        values.push(id);

        const [result] = await pool.query(
            `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
            values
        );
        return result.affectedRows;
    }

    
    static async updatePushToken(id, token) {
        const [result] = await pool.query(
            `UPDATE users SET expo_push_token = ? WHERE id = ?`,
            [token, id]
        );
        return result.affectedRows;
    }

    static async updateAddress(id, addressData) {
        const [result] = await pool.query(
            `UPDATE users SET
                address_line1 = COALESCE(?, address_line1),
                address_line2 = COALESCE(?, address_line2),
                city          = COALESCE(?, city),
                district      = COALESCE(?, district),
                pincode       = COALESCE(?, pincode),
                country       = COALESCE(?, country)
             WHERE id = ?`,
            [
                addressData.address_line1 || null,
                addressData.address_line2 || null,
                addressData.city || null,
                addressData.district || null,
                addressData.pincode || null,
                addressData.country || null,
                id
            ]
        );
        return result.affectedRows;
    }

    static async checkEmailConflict(email, excludeId) {
        const [rows] = await pool.query(
            "SELECT id FROM users WHERE email = ? AND id != ?",
            [email, excludeId]
        );
        return rows.length > 0;
    }
}

module.exports = User;
