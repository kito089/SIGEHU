import dotenv from 'dotenv';
import app from './app.js';

const PORT = process.env.PORT || 3000;

dotenv.config();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});