// Test script to verify admin token works
require('dotenv').config();

const token = process.env.ADMIN_TOKEN;

console.log('\n=== Admin Token Test ===');
console.log('Token loaded:', token ? 'YES' : 'NO');
console.log('Token length:', token ? token.length : 0);
console.log('Token value:', token);
console.log('First 10 chars:', token ? token.substring(0, 10) : 'N/A');

// Test fetch to local server
const testAuth = async () => {
    try {
        const response = await fetch('http://localhost:3000/admin/analytics', {
            headers: { 'x-admin-token': token }
        });

        console.log('\nAPI Test:');
        console.log('Status:', response.status);
        console.log('Status Text:', response.statusText);

        if (response.ok) {
            const data = await response.json();
            console.log('Success! Analytics data received');
            console.log('Total visits:', data.totalVisits);
            console.log('Active sessions:', data.activeCount);
        } else {
            const error = await response.json();
            console.log('Error:', error);
        }
    } catch (err) {
        console.error('Request failed:', err.message);
    }
};

// Run test if server is running
setTimeout(() => {
    testAuth();
}, 1000);
