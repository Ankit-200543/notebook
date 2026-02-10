require('dotenv').config();
const express = require('express');
const app = express();
const cors = require("cors");




const port = process.env.PORT || 3000;
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const corsOptions = {
  origin: 'https://bejewelled-cascaron-e58493.netlify.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

const connectDB = require('./util/connectDB')

const cookieParser = require('cookie-parser');


const notesRoutes = require('./routes/notesApi')
const userRoutes = require('./routes/userApi')


connectDB();
app.use(cookieParser());


app.get('/', (req, res) => {
  res.send("Welcome to Notes API")
});



app.use('/', notesRoutes);
app.use('/user', userRoutes);



app.listen(port, () => {
  console.log(`app is running on port ${port}`)
})
