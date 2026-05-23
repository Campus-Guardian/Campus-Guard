const express = require('express');
const app = express();

// Parse JSON bodies
app.use(express.json());

// Basic route to check if server is running
app.get('/', (req, res) => {
    res.json({
        message: 'Backend is successfully running!',
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// A simple test route for POST requests
app.post('/test', (req, res) => {
    res.json({
        message: 'Received a POST request successfully!',
        dataReceived: req.body,
        status: 'ok'
    });
});

// Render dynamically assigns a port, so we must use process.env.PORT
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
