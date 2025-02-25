const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const { v4: uuidv4 } = require("uuid");
const cors = require("cors");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.VITE_SWIFTSHOP_STRIPE_SK_TEST_KEY);

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://swift-shop-ad56f.web.app",
  ],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.SWIFT_SHOP_USER_NAME}:${process.env.SWIFT_SHOP_PASSWORD}@cluster0.2xcsswz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).send({ message: "unauthorized access" });

  jwt.verify(token, process.env.VITE_JSON_WEB_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const dbCollection = client.db("swiftshopDB");
    const featuresCollection = dbCollection.collection("features");
    const usersCollection = dbCollection.collection("users");
    const ordersCollection = dbCollection.collection("orders");
    const blogsCollection = dbCollection.collection("blogs");
    const reviewsCollection = dbCollection.collection("reviews");
    const cartsCollection = dbCollection.collection("carts");
    const paymentsCollection = dbCollection.collection("payments");
    const productsCollection = dbCollection.collection("products");

    // JWT Generated
    app.post("/swiftshop/api/v1/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.VITE_JSON_WEB_TOKEN_SECRET, {
        expiresIn: "14d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          samesite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    app.get("/swiftshop/api/v1/logout", async (req, res) => {
      res
        .cookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          samesite: process.env.NODE_ENV === "production" ? "none" : "strict",
          maxAge: 0,
        })
        .send({ success: true });
    });

    // Admin post a product
    app.post("/swiftshop/api/v1/add-products", async (req, res) => {
      const body = req.body;
      const result = await productsCollection.insertOne(body);
      res.send(result);
    });

    //  Get Delivered all product
    app.get("/swiftshop/api/v1/delivered-product", async (req, res) => {
      const cursor = await paymentsCollection
        .find({ orderStatus: "Delivered" })
        .toArray();
      res.send(cursor);
    });

    // Get Admin Trending Products
    app.get("/swiftshop/api/v1/add-products", async (req, res) => {
      const cursor = await productsCollection.find().toArray();
      res.send(cursor);
    });

    // Update Admin Specific Product
    app.put("/swiftshop/api/v1/add-products/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const addProductData = req.body;
      const updateDoc = {
        $set: {
          ...addProductData,
        },
      };
      const result = await productsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch("/swiftshop/api/v1/payments/:id", async (req, res) => {
      const id = req.params.id;
      const orderStatus = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: orderStatus,
      };
      const result = await paymentsCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // Payment post method
    app.post(
      "/swiftshop/api/v1/create-payment-intent",

      async (req, res) => {
        const { price } = req.body;
        const amount = Math.round(parseFloat(price) * 100);
        console.log(amount);
        try {
          const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: "usd",
            automatic_payment_methods: {
              enabled: true,
            },
          });
          res.send({ clientSecret: paymentIntent.client_secret });
        } catch (error) {
          console.error("Error creating payment intent:", error);
          res.status(500).send({ error: "Payment creation failed" });
        }
      }
    );

    // User's Order Data
    app.post("/swiftshop/api/v1/orders", async (req, res) => {
      const body = req.body;
      const result = await ordersCollection.insertOne(body);
      res.send(result);
    });

    // User's Payment his choice product
    app.post("/swiftshop/api/v1/payment", async (req, res) => {
      const body = req.body;
      const result = await paymentsCollection.insertOne(body);
      res.send(result);
    });

    // User specific succeeded email /
    app.get("/swiftshop/api/v1/payment", async (req, res) => {
      const email = req.query.email;
      const query = { email: email, status: "succeeded" };
      const cursor = await paymentsCollection.find(query).toArray();
      res.send(cursor);
    });

    // Get User's Posted Payments Data
    app.get("/swiftshop/api/v1/payments", async (req, res) => {
      const size = parseInt(req.query.size);
      const pages = parseInt(req.query.pages) - 1;
      const filter = req.query.filter;
      const sort = req.query.sort;
      let options = {};
      let query = {};
      if (filter) query = { orderStatus: filter };
      if (sort)
        options = {
          sort: { formattedDate: sort === "asc" ? 1 : -1 },
        };
      console.log(options);

      const cursor = await paymentsCollection
        .find(query)
        .skip(pages * size)
        .limit(size)
        .toArray();
      res.send(cursor);
    });

    app.get("/swiftshop/api/v1/products-count", async (req, res) => {
      const search = req.query.search;
      const filter = req.status; // Status check
      const count = await paymentsCollection.countDocuments(filter);
      res.send({ count });
    });

    // Cart's Data quantity Update
    app.patch("/swiftshop/api/v1/carts/:id", async (req, res) => {
      const id = req.params.id;
      const { quantity, price } = req.body;
      const query = { _id: new ObjectId(id) };
      const currentItem = await cartsCollection.findOne(query);
      const updateDoc = {
        $set: {
          quantity: quantity,
          price: price !== undefined ? price : currentItem.price,
        },
      };
      const result = await cartsCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // Add or Update Cart Product
    app.post("/swiftshop/api/v1/carts", async (req, res) => {
      const body = req.body;
      const result = await cartsCollection.insertOne(body);
      res.send(result);
    });

    // Get Buy a product and saved this data to DB
    app.get("/swiftshop/api/v1/carts", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartsCollection.find(query).toArray();
      res.send(result);
    });

    // Get all pending-product data
    app.get("/swiftshop/api/v1/pending-product", async (req, res) => {
      const cursor = await cartsCollection.find().toArray();
      res.send(cursor);
    });

    // User's can posted review
    app.post("/swiftshop/api/v1/reviews", async (req, res) => {
      const body = req.body;
      const result = await reviewsCollection.insertOne(body);
      res.send(result);
    });

    // Only user's deleted his carts pages data
    app.delete("/swiftshop/api/v1/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const cursor = await cartsCollection.deleteOne(query);
      res.send(cursor);
    });

    // Get User's Posted All Review Data
    app.get("/swiftshop/api/v1/reviews", async (req, res) => {
      const cursor = await reviewsCollection.find().toArray();
      res.send(cursor);
    });

    // Get All Orders Data
    app.get("/swiftshop/api/v1/all-orders", async (req, res) => {
      const cursor = await ordersCollection.find().toArray();
      res.send(cursor);
    });

    // Get Order product data specefic user's email
    app.get("/swiftshop/api/v1/orders", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await ordersCollection.find(query).toArray();
      res.send(result);
    });

    // Get specific ID's data
    app.get("/swiftshop/api/v1/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const cursor = await ordersCollection.findOne(query);
      res.send(cursor);
    });

    // Order Product data update
    app.put("/swiftshop/api/v1/orders/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const addProductData = req.body;
      const updateDoc = {
        $set: {
          ...addProductData,
        },
      };
      const result = await ordersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // User's Information Update
    app.put("/swiftshop/api/v1/users/:id", async (req, res) => {
      const id = req.params.id;
      const user = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: { ...user },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    //  Update Order Product status
    app.patch("/swiftshop/api/v1/orders/:id", async (req, res) => {
      const id = req.params.id;
      const status = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: status,
      };
      const result = await ordersCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // User's Data Saved in DB
    app.post("/swiftshop/api/v1/users", async (req, res) => {
      const body = req.body;
      const result = await usersCollection.insertOne(body);
      res.send(result);
    });

    // Get All User's
    app.get("/swiftshop/api/v1/users", async (req, res) => {
      const size = parseInt(req.query.size);
      const pages = parseInt(req.query.pages) - 1;
      const filter = req.query.filter;
      let query = {};
      if (filter) query = { role: filter };
      const result = await usersCollection
        .find(query)
        .skip(pages * size)
        .limit(size)
        .toArray();
      res.send(result);
    });

    // Get User's Count Data
    app.get("/swiftshop/api/v1/users-count", async (req, res) => {
      const filter = req.role;
      const count = await usersCollection.countDocuments(filter);
      res.send({ count });
    });

    // User's Role changes
    app.patch("/swiftshop/api/v1/users/:id", async (req, res) => {
      const id = req.params.id;
      const role = req.body;
      const query = { _id: new ObjectId(id) };
      const updateRole = {
        $set: role,
      };
      const result = await usersCollection.updateOne(query, updateRole);
      res.send(result);
    });

    // Deleted a user's
    app.delete("/swiftshop/api/v1/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const cursor = await usersCollection.deleteOne(query);
      res.send(cursor);
    });

    // Get user's Role Data
    app.get("/swiftshop/api/v1/users/:email", async (req, res) => {
      const email = req.params.email;
      const result = await usersCollection.findOne({ email });
      res.send(result);
    });

    // Get Features Product All Data
    app.get("/swiftshop/api/v1/features", async (req, res) => {
      const cursor = await featuresCollection.find().toArray();
      res.send(cursor);
    });

    // Get Specific Features Product Data
    app.get("/swiftshop/api/v1/features/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const cursor = await featuresCollection.findOne(query);
      res.send(cursor);
    });

    // Delete Specific Features Product Data
    app.delete("/swiftshop/api/v1/features/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const cursor = await featuresCollection.deleteOne(query);
      res.send(cursor);
    });

    // Get Blogs Data
    app.get("/swiftshop/api/v1/blogs", async (req, res) => {
      const cursor = await blogsCollection.find().toArray();
      res.send(cursor);
    });

    // Get Specific Blogs Data
    app.get("/swiftshop/api/v1/blogs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const cursor = await blogsCollection.findOne(query);
      res.send(cursor);
    });

    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("swift-shop server is Running ---->");
});

app.listen(port, () => {
  console.log(`swift-shop server Currently Running on: ----> ${port}`);
});
