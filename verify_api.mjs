
const BASE_URL = 'http://localhost:3000/api';

async function test() {
    console.log('Starting API Verification...');

    // 1. Create License
    console.log('\n[POST] /licenses - Creating License...');
    const licenseRes = await fetch(`${BASE_URL}/licenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Test Software 2026',
            totalQuantity: 5,
            purchaseDate: new Date().toISOString(),
            description: 'API Test License'
        })
    });
    if (!licenseRes.ok) throw new Error(`Failed to create license: ${licenseRes.status} ${licenseRes.statusText}`);
    const license = await licenseRes.json();
    console.log('Created License:', license.id);

    // 2. Create Employee
    console.log('\n[POST] /employees - Creating Employee...');
    const empRes = await fetch(`${BASE_URL}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Test User',
            department: 'DevOps',
            email: `test_${Date.now()}@example.com`
        })
    });
    if (!empRes.ok) throw new Error(`Failed to create employee: ${empRes.status} ${empRes.statusText}`);
    const employee = await empRes.json();
    console.log('Created Employee:', employee.id);

    // 3. Assign License
    console.log('\n[POST] /assignments - Assigning License...');
    const assignRes = await fetch(`${BASE_URL}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            licenseId: license.id,
            employeeId: employee.id
        })
    });
    if (!assignRes.ok) throw new Error(`Failed to assign: ${assignRes.status} ${assignRes.statusText}`);
    const assignment = await assignRes.json();
    console.log('Assigned:', assignment.id);

    // 4. List Assignments
    console.log('\n[GET] /assignments - Listing Assignments...');
    const listRes = await fetch(`${BASE_URL}/assignments`);
    const list = await listRes.json();
    console.log(`Found ${list.length} assignments.`);
    const found = list.find(a => a.id === assignment.id);
    if (!found) throw new Error('Created assignment not found in list!');
    console.log('Assignment verified in list.');

    // 5. Return Assignment
    console.log('\n[PUT] /assignments/:id - Returning...');
    const returnRes = await fetch(`${BASE_URL}/assignments/${assignment.id}`, {
        method: 'PUT'
    });
    if (!returnRes.ok) throw new Error(`Failed to return: ${returnRes.status} ${returnRes.statusText}`);
    const returned = await returnRes.json();
    console.log('Returned successfully.');

    console.log('\n✅ API Verification Passed!');
}

test().catch(err => {
    console.error('\n❌ Verification Failed:', err);
    process.exit(1);
});
