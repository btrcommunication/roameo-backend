const path = require('path');
const ExcelJS = require('exceljs');
const swaggerSpec = require('./config/swagger');

// Helper to format JSON safely
const formatJson = (obj) => {
    if (!obj) return 'N/A';
    try {
        return JSON.stringify(obj, null, 2);
    } catch (e) {
        return String(obj);
    }
};

const extractData = () => {
    const rows = [];
    const paths = swaggerSpec.paths || {};

    for (const [url, methods] of Object.entries(paths)) {
        for (const [method, details] of Object.entries(methods)) {
            // 1. Method
            const apiMethod = method.toUpperCase();
            
            // 2. API Name
            const apiName = details.summary || 'N/A';
            
            // 3. API URL
            const apiUrl = url;
            
            // 4. Request Body
            let requestBody = 'N/A';
            if (details.requestBody && details.requestBody.content && details.requestBody.content['application/json']) {
                const schema = details.requestBody.content['application/json'].schema;
                if (schema.example) {
                    requestBody = formatJson(schema.example);
                } else if (schema.properties) {
                    // Extract properties for an example
                    const example = {};
                    for (const [prop, propDetails] of Object.entries(schema.properties)) {
                        example[prop] = propDetails.example || typeof propDetails.type;
                    }
                    requestBody = formatJson(example);
                }
            }

            // 5. Authorization Token
            let authToken = 'No';
            if (details.security && details.security.length > 0) {
                // Check if BearerAuth is in the security array
                const hasBearer = details.security.some(sec => sec.BearerAuth);
                if (hasBearer) authToken = 'Yes (Bearer Token)';
                else authToken = 'Yes';
            }

            // 6. Response
            let responseStr = 'N/A';
            if (details.responses) {
                // Find a success response (200 or 201)
                const successCode = Object.keys(details.responses).find(code => code.startsWith('2'));
                if (successCode) {
                    const responseObj = details.responses[successCode];
                    if (responseObj.content && responseObj.content['application/json']) {
                        const schema = responseObj.content['application/json'].schema;
                        if (schema.example) {
                            responseStr = formatJson(schema.example);
                        } else if (schema.properties) {
                            const example = {};
                            for (const [prop, propDetails] of Object.entries(schema.properties)) {
                                example[prop] = propDetails.example || typeof propDetails.type;
                            }
                            responseStr = formatJson(example);
                        }
                    } else if (responseObj.description) {
                         responseStr = responseObj.description;
                    }
                }
            }

            rows.push({
                'Method': apiMethod,
                'API Name': apiName,
                'API URL': apiUrl,
                'Request Body': requestBody,
                'Authorization Token': authToken,
                'Response': responseStr
            });
        }
    }
    return rows;
};

const exportToExcel = async () => {
    const data = extractData();
    
    // Create a new workbook and worksheet using exceljs
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('API Documentation');

    // Define columns and widths
    worksheet.columns = [
        { header: 'Method', key: 'Method', width: 12 },
        { header: 'API Name', key: 'API Name', width: 35 },
        { header: 'API URL', key: 'API URL', width: 45 },
        { header: 'Request Body', key: 'Request Body', width: 50 },
        { header: 'Authorization Token', key: 'Authorization Token', width: 25 },
        { header: 'Response', key: 'Response', width: 60 }
    ];

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }; // White text
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0070C0' } // Nice professional blue
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Add data rows and style them for JSON wrapping
    data.forEach(item => {
        const row = worksheet.addRow(item);
        row.alignment = { vertical: 'top', wrapText: true };
    });

    // Define where to save the file
    const outputPath = path.join(__dirname, 'API_Documentation.xlsx');

    // Write to file
    await workbook.xlsx.writeFile(outputPath);
    
    console.log(`✅ API Documentation (Styled Excel format) successfully saved to: ${outputPath}`);
};

exportToExcel();
