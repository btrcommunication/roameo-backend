/**
 * Email Templates for Roameo
 * Provides HTML & Plain-text templates based on Email notification templates.md
 */

const DEFAULT_BRAND = {
    name: "ROAMEO",
    supportEmail: process.env.SUPPORT_EMAIL || "roameo@btrcommunication.com",
    phone: process.env.SUPPORT_PHONE || "+27 11 000 0000",
    website: process.env.WEBSITE_URL || "https://roameo.co.za",
    loginUrl: process.env.VENDOR_LOGIN_URL || "https://roameo.co.za/vendor/login",
    primaryColor: "#FF5A1F",
    textColor: "#1F2937",
    bgColor: "#F9FAFB"
};

/**
 * Base wrapper for consistent HTML email layout
 */
const baseLayout = ({ title, preheader, content, brand = DEFAULT_BRAND }) => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: ${brand.bgColor};
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: ${brand.textColor};
            line-height: 1.6;
        }
        .container {
            max-width: 600px;
            margin: 30px auto;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid #e5e7eb;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        .header {
            background: linear-gradient(135deg, ${brand.primaryColor} 0%, #EA580C 100%);
            padding: 28px 32px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            color: #ffffff;
            font-size: 26px;
            font-weight: 700;
            letter-spacing: 1px;
        }
        .body-content {
            padding: 32px;
        }
        .greeting {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #111827;
        }
        .info-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 24px 0;
        }
        .info-card h3 {
            margin-top: 0;
            margin-bottom: 14px;
            font-size: 16px;
            color: #334155;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 8px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            font-size: 14px;
        }
        .info-label {
            font-weight: 600;
            color: #64748b;
        }
        .info-value {
            font-weight: 500;
            color: #0f172a;
            text-align: right;
        }
        .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .badge-success {
            background-color: #dcfce7;
            color: #15803d;
        }
        .badge-danger {
            background-color: #fee2e2;
            color: #b91c1c;
        }
        .badge-info {
            background-color: #e0f2fe;
            color: #0369a1;
        }
        .coupons-list {
            margin: 12px 0 0 0;
            padding: 0;
            list-style: none;
        }
        .coupon-item {
            background: #fff;
            border: 1px dashed #cbd5e1;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .coupon-name {
            font-weight: 600;
            color: #1e293b;
        }
        .coupon-code {
            font-family: monospace;
            background: #f1f5f9;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 13px;
            font-weight: bold;
            color: ${brand.primaryColor};
        }
        .btn {
            display: inline-block;
            background-color: ${brand.primaryColor};
            color: #ffffff !important;
            padding: 12px 28px;
            font-size: 15px;
            font-weight: 600;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
            text-align: center;
        }
        .steps-list {
            margin: 16px 0;
            padding-left: 20px;
            color: #334155;
        }
        .steps-list li {
            margin-bottom: 8px;
        }
        .footer {
            background: #f8fafc;
            border-top: 1px solid #e5e7eb;
            padding: 24px 32px;
            text-align: center;
            font-size: 13px;
            color: #6b7280;
        }
        .footer a {
            color: ${brand.primaryColor};
            text-decoration: none;
        }
        .footer-links {
            margin-top: 12px;
        }
        .footer-links span {
            margin: 0 8px;
            color: #cbd5e1;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${brand.name}</h1>
        </div>
        <div class="body-content">
            ${content}
        </div>
        <div class="footer">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #374151;">${brand.name}</p>
            <div class="footer-links">
                <a href="${brand.website}">${brand.website}</a>
                <span>|</span>
                <a href="mailto:${brand.supportEmail}">${brand.supportEmail}</a>
                <span>|</span>
                <span>${brand.phone}</span>
            </div>
            <p style="margin: 12px 0 0 0; font-size: 11px; color: #9ca3af;">&copy; ${new Date().getFullYear()} ${brand.name}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
};

/**
 * 1. Customer Welcome Email Template
 * @param {Object} data
 * @param {string} data.name - Customer's full name
 * @param {string} [data.email] - Customer's email
 * @param {Object} [brand] - Custom brand overrides
 */
const welcomeCustomerTemplate = (data, brand = DEFAULT_BRAND) => {
    const customerName = data.name || "Customer";
    const subject = `Welcome to ${brand.name}! 🎉`;

    const content = `
        <div class="greeting">Dear ${customerName},</div>
        <p>Welcome! 🎉 Your account has been successfully created, and we’re excited to have you with us.</p>
        <p>You can now log in to the app and explore our services, exclusive offers, and features designed to make your experience easier and more convenient.</p>
        <p>Thank you for joining us. We look forward to serving you!</p>
        <p style="margin-top: 28px;">
            Warm regards,<br>
            <strong>${brand.name} Team</strong>
        </p>
    `;

    const text = `Dear ${customerName},

Welcome! 🎉 Your account has been successfully created, and we're excited to have you with us.

You can now log in to the app and explore our services, offers, and features designed to make your experience easier and more convenient.

Thank you for joining us. We look forward to serving you!

Best Regards,
${brand.name} Team
${brand.website} | ${brand.supportEmail}
`;

    return {
        subject,
        html: baseLayout({ title: subject, content, brand }),
        text
    };
};

/**
 * 2. Order Completion Email Template
 * @param {Object} data
 * @param {string} data.customerName - Customer name
 * @param {string|number} data.orderNumber - Order ID/Number
 * @param {string} data.orderDate - Order placement date
 * @param {string} [data.completionDate] - Order completion date
 * @param {string|number} data.totalAmount - Total order amount
 * @param {Array<{name: string, code: string}>} [data.coupons] - Purchased / redeemed coupons
 * @param {Object} [brand] - Custom brand overrides
 */
const orderCompletedTemplate = (data, brand = DEFAULT_BRAND) => {
    const customerName = data.customerName || "Valued Customer";
    const orderNumber = data.orderNumber || "N/A";
    const orderDate = data.orderDate || new Date().toLocaleDateString();
    const completionDate = data.completionDate || new Date().toLocaleDateString();
    const totalAmount = data.totalAmount !== undefined ? data.totalAmount : "0";
    const coupons = Array.isArray(data.coupons) ? data.coupons : [];

    const subject = "Your Order Has Been Completed – Thank You for Shopping With Us!";

    let couponsHtml = "";
    let couponsText = "";
    if (coupons.length > 0) {
        couponsHtml = `
            <div style="margin-top: 14px;">
                <div style="font-weight: 600; font-size: 13px; color: #475569; margin-bottom: 6px;">Coupon Details:</div>
                <ul class="coupons-list">
                    ${coupons.map(c => `
                        <li class="coupon-item">
                            <span class="coupon-name">${c.name || c.title || "Coupon"}</span>
                            <span class="coupon-code">${c.code || c.coupon_code || ""}</span>
                        </li>
                    `).join("")}
                </ul>
            </div>
        `;
        couponsText = `\nCoupons:\n` + coupons.map(c => `- ${c.name || c.title || "Coupon"}: ${c.code || c.coupon_code || ""}`).join("\n");
    }

    const content = `
        <div class="greeting">Dear ${customerName},</div>
        <p>We’re happy to let you know that your order <strong>#${orderNumber}</strong> has been successfully completed.</p>
        
        <div class="info-card">
            <h3>Order Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Order Number:</td>
                    <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #0f172a;">#${orderNumber}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Order Date:</td>
                    <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #0f172a;">${orderDate}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Completed On:</td>
                    <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #0f172a;">${completionDate}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Total Amount:</td>
                    <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #0f172a;">R${totalAmount}</td>
                </tr>
            </table>
            ${couponsHtml}
        </div>

        <p>Thank you for choosing <strong>${brand.name}</strong>. We truly appreciate your trust and support.</p>
        <p>If you have any questions or need assistance regarding your order, please feel free to contact us at <a href="mailto:${brand.supportEmail}" style="color: ${brand.primaryColor}; text-decoration: none;"><strong>${brand.supportEmail}</strong></a>.</p>
        <p>We look forward to serving you again!</p>
        <p style="margin-top: 28px;">
            Warm regards,<br>
            <strong>${brand.name} Team</strong>
        </p>
    `;

    const text = `Dear ${customerName},

We're happy to let you know that your order #${orderNumber} has been successfully completed.

Order Details:
- Order Number: #${orderNumber}
- Order Date: ${orderDate}
- Completed On: ${completionDate}
- Total Amount: R${totalAmount}
${couponsText}

Thank you for choosing ${brand.name}. We truly appreciate your trust and support.

If you have any questions or need assistance regarding your order, please contact us at ${brand.supportEmail}.

We look forward to serving you again!

Warm regards,
${brand.name}
${brand.website} | ${brand.phone} | ${brand.supportEmail}
`;

    return {
        subject,
        html: baseLayout({ title: subject, content, brand }),
        text
    };
};

/**
 * 3. Vendor Acceptance Email Template
 * @param {Object} data
 * @param {string} data.vendorName - Vendor name
 * @param {string|number} data.applicationId - Vendor application ID
 * @param {string} [data.approvalDate] - Approval date
 * @param {string|number} [data.vendorId] - Vendor ID
 * @param {string} [data.loginLink] - Direct login URL
 * @param {Object} [brand] - Custom brand overrides
 */
const vendorAcceptedTemplate = (data, brand = DEFAULT_BRAND) => {
    const vendorName = data.vendorName || "Vendor Partner";
    const applicationId = data.applicationId || "N/A";
    const approvalDate = data.approvalDate || new Date().toLocaleDateString();
    const vendorId = data.vendorId || applicationId;
    const loginLink = data.loginLink || brand.loginUrl;

    const subject = "Congratulations! Your Vendor Application Has Been Approved";

    const content = `
        <div class="greeting">Dear ${vendorName},</div>
        <p>We are pleased to inform you that your vendor application with <strong>${brand.name}</strong> has been <span class="badge badge-success">Approved</span>.</p>

        <div class="info-card">
            <h3>Vendor Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Vendor Name:</td>
                    <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #0f172a;">${vendorName}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Application ID:</td>
                    <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #0f172a;">#${applicationId}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Approval Date:</td>
                    <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #0f172a;">${approvalDate}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Vendor ID:</td>
                    <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #0f172a;">#${vendorId}</td>
                </tr>
            </table>
        </div>

        <p>You can now access your vendor account and start managing your products/services, orders, and other vendor activities through <strong>${brand.name}</strong>.</p>

        <h3 style="color: #1e293b; margin-top: 24px; font-size: 16px;">Next Steps:</h3>
        <ol class="steps-list">
            <li>Log in to your vendor account using your registered credentials.</li>
            <li>Complete your vendor profile, if required.</li>
            <li>Add or update your coupons and relevant information.</li>
            <li>Start accepting and managing orders through the platform.</li>
        </ol>

        <div style="text-align: center; margin: 28px 0;">
            <a href="${loginLink}" class="btn">Login to Vendor Portal</a>
        </div>

        <p>If you have any questions or need assistance, please contact our admin/support team at <a href="mailto:${brand.supportEmail}" style="color: ${brand.primaryColor}; text-decoration: none;"><strong>${brand.supportEmail}</strong></a> or <strong>${brand.phone}</strong>.</p>
        <p>We’re delighted to have you as a vendor partner and look forward to a successful association.</p>

        <p style="margin-top: 28px;">
            Warm regards,<br>
            <strong>Admin Team ${brand.name}</strong>
        </p>
    `;

    const text = `Dear ${vendorName},

We are pleased to inform you that your vendor application with ${brand.name} has been APPROVED.

Vendor Details:
- Vendor Name: ${vendorName}
- Application ID: #${applicationId}
- Approval Date: ${approvalDate}
- Vendor ID: #${vendorId}

You can now access your vendor account and start managing your products/services, orders, and other vendor activities through ${brand.name}.

Next Steps:
1. Log in to your vendor account using your registered credentials.
2. Complete your vendor profile, if required.
3. Add or update your coupons and relevant information.
4. Start accepting and managing orders through the platform.

Vendor Login: ${loginLink}

If you have any questions or need assistance, please contact our support team at ${brand.supportEmail} or ${brand.phone}.

We're delighted to have you as a vendor partner and look forward to a successful association.

Warm regards,
Admin Team ${brand.name}
${brand.supportEmail} | ${brand.phone} | ${brand.website}
`;

    return {
        subject,
        html: baseLayout({ title: subject, content, brand }),
        text
    };
};

/**
 * 4. Vendor Rejection Email Template
 * @param {Object} data
 * @param {string} data.vendorName - Vendor name
 * @param {string|number} data.applicationId - Application ID
 * @param {string} [data.applicationDate] - Submission date
 * @param {string} data.reason - Reason for rejection
 * @param {string} [data.supportEmail] - Support email override
 * @param {Object} [brand] - Custom brand overrides
 */
const vendorRejectedTemplate = (data, brand = DEFAULT_BRAND) => {
    const vendorName = data.vendorName || "Vendor Applicant";
    const applicationId = data.applicationId || "N/A";
    const applicationDate = data.applicationDate || new Date().toLocaleDateString();
    const reason = data.reason || "Application criteria not met.";
    const supportEmail = data.supportEmail || brand.supportEmail;

    const subject = `Update on Your Vendor Application – ${brand.name}`;

    const content = `
        <div class="greeting">Dear ${vendorName},</div>
        <p>Thank you for your interest in becoming a vendor with <strong>${brand.name}</strong>.</p>
        <p>After reviewing your vendor application and the information provided, we regret to inform you that your application has <strong>not been approved at this time</strong>.</p>

        <div class="info-card">
            <h3>Application Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Vendor Name:</td>
                    <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #0f172a;">${vendorName}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Application ID:</td>
                    <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #0f172a;">#${applicationId}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Application Date:</td>
                    <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #0f172a;">${applicationDate}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Status:</td>
                    <td style="padding: 6px 0; text-align: right;"><span class="badge badge-danger">Rejected</span></td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #64748b; vertical-align: top;">Reason:</td>
                    <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #dc2626;">${reason}</td>
                </tr>
            </table>
        </div>

        <p>We appreciate the time and effort you invested in the application. If applicable, you may address the above concerns and submit a new application in the future.</p>
        <p>If you believe this decision was made in error or have questions regarding the rejection, please contact our support team at <a href="mailto:${supportEmail}" style="color: ${brand.primaryColor}; text-decoration: none;"><strong>${supportEmail}</strong></a>.</p>
        <p>Thank you for your understanding.</p>

        <p style="margin-top: 28px;">
            Best regards,<br>
            <strong>Admin Operations Team</strong><br>
            <strong>${brand.name}</strong>
        </p>
    `;

    const text = `Dear ${vendorName},

Thank you for your interest in becoming a vendor with ${brand.name}.

After reviewing your vendor application and the information provided, we regret to inform you that your application has not been approved at this time.

Application Details:
- Vendor Name: ${vendorName}
- Application ID: #${applicationId}
- Application Date: ${applicationDate}
- Status: Rejected
- Reason: ${reason}

We appreciate the time and effort you invested in the application. If applicable, you may address the above concerns and submit a new application in the future.

If you believe this decision was made in error or have questions regarding the rejection, please contact our support team at ${supportEmail}.

Thank you for your understanding.

Best regards,
Admin Operations Team
${brand.name}
${supportEmail} | ${brand.phone} | ${brand.website}
`;

    return {
        subject,
        html: baseLayout({ title: subject, content, brand }),
        text
    };
};

/**
 * 5. Coupon Approval Email Template
 * @param {Object} data
 * @param {string} [data.vendorName] - Vendor name
 * @param {string|number} [data.couponId] - Coupon ID
 * @param {string} data.couponTitle - Coupon title / name
 * @param {string} [data.couponCode] - Coupon code
 * @param {string} [data.discount] - Discount or offer info
 * @param {Object} [brand] - Custom brand overrides
 */
const couponApprovedTemplate = (data, brand = DEFAULT_BRAND) => {
    const vendorName = data.vendorName || "Vendor Partner";
    const couponTitle = data.couponTitle || "Your Coupon";
    const couponCode = data.couponCode || "";
    const couponId = data.couponId || "";
    const discount = data.discount || "";

    const subject = `Coupon Approved – Now Active`;

    const content = `
        <div class="greeting">Dear ${vendorName},</div>
        <p>We’re pleased to inform you that your coupon has been reviewed and <span class="badge badge-success">Approved</span> by the admin.</p>
        <p>Your coupon is now active and available for customers to use.</p>

        <div class="info-card">
            <h3>Coupon Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
                ${couponId ? `
                <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Coupon ID:</td>
                    <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #0f172a;">#${couponId}</td>
                </tr>` : ""}
                <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Coupon Title:</td>
                    <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #0f172a;">${couponTitle}</td>
                </tr>
                ${couponCode ? `
                <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Coupon Code:</td>
                    <td style="padding: 6px 0; text-align: right;"><span class="coupon-code">${couponCode}</span></td>
                </tr>` : ""}
                ${discount ? `
                <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Discount / Offer:</td>
                    <td style="padding: 6px 0; text-align: right; font-weight: 600; color: ${brand.primaryColor};">${discount}</td>
                </tr>` : ""}
                <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Status:</td>
                    <td style="padding: 6px 0; text-align: right;"><span class="badge badge-success">Active</span></td>
                </tr>
            </table>
        </div>

        <p>Thank you for being a valued partner.</p>

        <p style="margin-top: 28px;">
            Best Regards,<br>
            <strong>Admin Team ${brand.name}</strong>
        </p>
    `;

    const text = `Dear ${vendorName},

We're pleased to inform you that your coupon "${couponTitle}" has been reviewed and approved by the admin.

Your coupon is now active and available for customers to use.

Coupon Details:
- Coupon Title: ${couponTitle}
${couponCode ? `- Coupon Code: ${couponCode}\n` : ""}${discount ? `- Discount / Offer: ${discount}\n` : ""}- Status: Active

Thank you for being a valued partner.

Best Regards,
Admin Team ${brand.name}
${brand.supportEmail} | ${brand.website}
`;

    return {
        subject,
        html: baseLayout({ title: subject, content, brand }),
        text
    };
};

/**
 * 6. Coupon Rejection Email Template
 * @param {Object} data
 * @param {string} [data.vendorName] - Vendor name
 * @param {string|number} data.couponId - Coupon ID
 * @param {string} data.couponTitle - Coupon Title
 * @param {string} [data.couponCode] - Coupon Code
 * @param {string} [data.discount] - Discount or offer info
 * @param {string} [data.submissionDate] - Date coupon was submitted
 * @param {string} data.reason - Reason for rejection
 * @param {string} [data.supportEmail] - Support email override
 * @param {Object} [brand] - Custom brand overrides
 */
const couponRejectedTemplate = (data, brand = DEFAULT_BRAND) => {
    const vendorName = data.vendorName || "Vendor Partner";
    const couponId = data.couponId || "N/A";
    const couponTitle = data.couponTitle || "Coupon";
    const couponCode = data.couponCode || "";
    const discount = data.discount || "N/A";
    const submissionDate = data.submissionDate || new Date().toLocaleDateString();
    const reason = data.reason || "Coupon did not meet platform guidelines.";
    const supportEmail = data.supportEmail || brand.supportEmail;

    const subject = `Coupon Submission Rejected – ${couponTitle} (ID: ${couponId})`;

    const content = `
        <div class="greeting">Dear ${vendorName},</div>
        <p>Thank you for submitting the coupon <strong>${couponTitle}</strong> ${couponCode ? `(<code>${couponCode}</code>)` : ""} for approval on <strong>${brand.name}</strong>.</p>
        <p>After reviewing the coupon details, we regret to inform you that the coupon has <span class="badge badge-danger">Not Been Approved</span> by our admin team.</p>

        <div class="info-card">
            <h3>Coupon Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Coupon ID:</td>
                    <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #0f172a;">#${couponId}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Coupon Title:</td>
                    <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #0f172a;">${couponTitle}</td>
                </tr>
                ${discount !== "N/A" ? `
                <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Discount / Offer:</td>
                    <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #0f172a;">${discount}</td>
                </tr>` : ""}
                <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Submission Date:</td>
                    <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #0f172a;">${submissionDate}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Status:</td>
                    <td style="padding: 6px 0; text-align: right;"><span class="badge badge-danger">Rejected</span></td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #64748b; vertical-align: top;">Reason for Rejection:</td>
                    <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #dc2626;">${reason}</td>
                </tr>
            </table>
        </div>

        <p>Please review the above issue and, if applicable, make the necessary changes before submitting the coupon again for approval.</p>
        <p>If you believe the rejection was made in error or need further clarification, please contact our admin/support team at <a href="mailto:${supportEmail}" style="color: ${brand.primaryColor}; text-decoration: none;"><strong>${supportEmail}</strong></a>.</p>
        <p>Thank you for your understanding and cooperation.</p>

        <p style="margin-top: 28px;">
            Best regards,<br>
            <strong>Admin Team ${brand.name}</strong>
        </p>
    `;

    const text = `Dear ${vendorName},

Thank you for submitting the coupon ${couponTitle} ${couponCode ? `(${couponCode})` : ""} for approval on ${brand.name}.

After reviewing the coupon details, we regret to inform you that the coupon has not been approved by our admin team.

Coupon Details:
- Coupon ID: #${couponId}
- Coupon Title: ${couponTitle}
- Discount/Offer: ${discount}
- Submission Date: ${submissionDate}
- Status: Rejected
- Reason for Rejection: ${reason}

Please review the above issue and, if applicable, make the necessary changes before submitting the coupon again for approval.

If you believe the rejection was made in error or need further clarification, please contact our support team at ${supportEmail}.

Thank you for your understanding and cooperation.

Best regards,
Admin Team ${brand.name}
${supportEmail} | ${brand.phone} | ${brand.website}
`;

    return {
        subject,
        html: baseLayout({ title: subject, content, brand }),
        text
    };
};

module.exports = {
    DEFAULT_BRAND,
    welcomeCustomerTemplate,
    orderCompletedTemplate,
    vendorAcceptedTemplate,
    vendorRejectedTemplate,
    couponApprovedTemplate,
    couponRejectedTemplate
};
