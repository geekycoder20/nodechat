const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Import the CORS module

const app = express();
const port = 3001;

app.use(cors()); // Enable CORS for all routes
app.use(bodyParser.json());

app.post('/submit-form', (req, res) => {
  const { name, email } = req.body;

  // Do something with the form data (e.g., save to a database)
  console.log('Received form data:', { name, email });

  res.status(200).json({ message: 'Form submitted successfully!' });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
