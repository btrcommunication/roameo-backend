const baseUrl = 'http://localhost:5000/api';

const users = {
    customer: { name: "Test Customer", email: "customer@test.com", password: "Password123!", phone: "1234567890", role: "customer" },
    vendor: { name: "Test Vendor", email: "vendor@test.com", password: "Password123!", phone: "0987654321", role: "vendor" },
    admin: { name: "Test Admin", email: "admin@test.com", password: "Password123!", phone: "1112223333", role: "admin" }
};

let tokens = {};
let state = { categoryId: null, listingId: null, vendorId: null, rewardTierId: null };
let summary = { pass: 0, fail: 0, errors: [] };

async function req(method, path, body = null, token = null, isFormData = false) {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    let reqBody = body;
    if (body && !isFormData) {
        headers['Content-Type'] = 'application/json';
        reqBody = JSON.stringify(body);
    }

    try {
        const res = await fetch(`${baseUrl}${path}`, { method, headers, body: reqBody });
        let resData = await res.text();
        try { resData = JSON.parse(resData); } catch(e) {}
        
        return { status: res.status, data: resData };
    } catch (e) {
        return { status: 0, error: e.message }; // Custom status 0 for fetch failure
    }
}

async function test(name, method, path, body = null, token = null, expectedStatus = 200, isFormData = false) {
    console.log(`\nTesting: [${method}] ${path} - ${name}`);
    const { status, data, error } = await req(method, path, body, token, isFormData);
    
    if (status === expectedStatus || status === 201) {
        console.log(`✅ PASS (${status})`);
        summary.pass++;
        return { success: true, data };
    } else {
        console.log(`❌ FAIL (${status})`);
        console.log(`Expected ${expectedStatus}, got ${status}`);
        if (error) console.log(`Error: ${error}`);
        else console.log(`Response:`, data);
        summary.fail++;
        summary.errors.push({ name, method, path, status, data });
        return { success: false, data };
    }
}

async function authenticateUsers() {
    for (const [role, data] of Object.entries(users)) {
        // Try signup
        let res = await test(`Signup ${role}`, 'POST', '/auth/signup', data, null, 201);
        if (!res.success && res.data && res.data.message && res.data.message.includes('already exists')) {
            // If exists, login
            res = await test(`Login ${role}`, 'POST', '/auth/login', { email: data.email, password: data.password });
        }
        
        const resData = res.data;
        if (resData && resData.token) {
            tokens[role] = resData.token;
            if (role === 'vendor' && resData.data && resData.data.user_id) {
                state.vendorId = resData.data.user_id;
            }
        } else {
            console.error(`Failed to authenticate ${role}`);
        }
    }
}

async function runTests() {
    await authenticateUsers();

    if (!tokens.customer || !tokens.admin || !tokens.vendor) {
        console.log("Could not obtain all tokens. Aborting.");
        return;
    }

    const cToken = tokens.customer;
    const aToken = tokens.admin;
    const vToken = tokens.vendor;

    // Public / General GET APIs
    await test("Get all categories", 'GET', '/categories');
    await test("Get newly listed categories", 'GET', '/categories/newly-listed');
    
    // Admin Routes
    const catRes = await test("Admin Create Category", 'POST', '/admin/category', { category_name: "Test Category " + Date.now(), description: "A test cat" }, aToken, 200);
    if (catRes.data && catRes.data.data && catRes.data.data.category_id) state.categoryId = catRes.data.data.category_id;

    // Vendor Routes
    const formData = new FormData();
    formData.append('title', 'Test Listing');
    formData.append('category_id', state.categoryId || 1);
    formData.append('price', '100');
    formData.append('city', 'New York');
    formData.append('address', '123 Test St');
    formData.append('description', 'Test Description');
    // Mocking a file upload with a Blob
    const fileBlob = new Blob(['dummy content'], { type: 'image/jpeg' });
    formData.append('listing_image', fileBlob, 'dummy.jpg');
    // Using multipart/form-data for vendor listing creation
    const listingRes = await test("Vendor Create Listing", 'POST', '/vendor/listing/vendor/create', formData, vToken, 201, true);
    if (listingRes.data && listingRes.data.data && listingRes.data.data.listing && listingRes.data.data.listing.listing_id) {
        state.listingId = listingRes.data.data.listing.listing_id;
    }

    // Customer Routes
    await test("Home Details", 'GET', '/home', null, cToken);
    await test("Home Coupons", 'GET', '/home/coupons', null, cToken);
    await test("Home Recommended", 'GET', '/home/recommended', null, cToken);
    await test("Home Deals", 'GET', '/home/deals?lat=40.71&lng=-74.00', null, cToken);
    await test("Home Newly Listed", 'GET', '/home/newly-listed', null, cToken);
    await test("Home Popular Activities", 'GET', '/home/popular', null, cToken);

    await test("Get Filtered Listings", 'GET', '/listings?city=New York', null, cToken);
    await test("Get Newly Added Listings", 'GET', '/listings/newlyAdded', null, cToken);
    if (state.listingId) {
        await test("Get Listing Details", 'GET', `/listings/details?id=${state.listingId}`, null, cToken);
        await test("Get Listing Reviews", 'GET', `/listings/reviews?listing_id=${state.listingId}`, null, cToken);
        await test("Add Review", 'POST', '/listings/reviews', { listing_id: state.listingId, rating: 5, comment: "Great!" }, cToken, 201);
    } else {
        console.log("Skipping listing detail tests (no listingId)");
    }

    await test("Activity Popular", 'GET', '/activities/popular', null, cToken);

    // Profile Routes
    await test("Get Profile", 'GET', '/profile', null, cToken);
    await test("Edit Profile Info", 'PUT', '/profile/edit-info', { name: "Updated Customer" }, cToken);
    await test("Edit Profile Address", 'PUT', '/profile/edit-address', { city: "Updated City", address_line1: "123 Update St" }, cToken);

    // More Admin Routes
    await test("Admin Get Listings", 'GET', '/admin/listings', null, aToken);
    if (state.listingId) {
        await test("Admin Update Listing", 'PUT', `/admin/listings/${state.listingId}`, { status: "rejected" }, aToken);
        // We won't delete it just yet, to keep it for other tests if they run later.
    }
    await test("Admin Get Vendors", 'GET', '/admin/vendors', null, aToken);
    
    // Pick an existing vendor ID from the database for the next tests
    const vendorsList = await req('GET', '/admin/vendors', null, aToken);
    if (vendorsList.data && vendorsList.data.data && vendorsList.data.data.length > 0) {
        state.vendorId = vendorsList.data.data[0].vendor_id || vendorsList.data.data[0].id;
    }

    if (state.vendorId) {
        await test("Admin Update Vendor", 'PUT', `/admin/vendors/${state.vendorId}`, { business_name: "Updated Vendor" }, aToken);
        await test("Admin Adjust Vendor Rewards", 'POST', `/admin/vendors/${state.vendorId}/adjust-rewards`, { add_reward_points: 100, reason: "Bonus" }, aToken);
    }
    await test("Admin Get Reward Tiers", 'GET', '/admin/rewards/tiers', null, aToken);
    // Not updating tier ID since we don't know it, but we hit the list.

    console.log("\n================ SUMMARY ================");
    console.log(`Passed: ${summary.pass}`);
    console.log(`Failed: ${summary.fail}`);
    
    if (summary.fail > 0) {
        console.log("Failures summary:");
        summary.errors.forEach(e => {
            console.log(`- [${e.method}] ${e.path} (${e.status})`);
        });
    } else {
        console.log("All tests passed! 🎉");
    }
}

runTests();
