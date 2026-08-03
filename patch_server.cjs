const fs = require('fs');

const content = `import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { db } from "./src/db/index.ts";
import { products, orders, orderItems, inventoryItems, inventoryLogs } from "./src/db/schema.ts";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { getOrCreateUser } from "./src/db/users.ts";
import authRouter from "./src/routes/auth.ts";
import shiftsRouter, { requirePosAuth } from "./src/routes/shifts.ts";
import schedulingRouter from "./src/routes/scheduling.ts";
import { createClient } from "redis";
import * as Minio from "minio";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { create } from "xmlbuilder2";
import QRCode from "qrcode";
import { eq, desc } from "drizzle-orm";

// -- Redis Config --
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Suppress connection errors in development to prevent error noise when Redis is absent
redisClient.on('error', () => {});
// We won't strictly await connect here to prevent crashing the preview if Redis isn't running
redisClient.connect().catch(() => {});

// -- MinIO Config --
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

const app = express();
app.set('trust proxy', true);
app.use(express.json());

// -- Swagger Config --
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "NexusCafe POS API",
      version: "1.0.0",
      description: "API for NexusCafe POS, Inventory, and ZATCA integration",
    },
    servers: [{ url: "/api" }],
  },
  apis: ["./server.ts"],
};

const specs = swaggerJsdoc(options);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

// -- Routes --
app.use("/api/auth", authRouter);
app.use("/api/shifts", shiftsRouter);
app.use("/api/scheduling", schedulingRouter);

app.post("/api/auth/sync", requirePosAuth, async (req: any, res) => {
  try {
    const user = req.user;
    // Mock user creation/retrieval for now
    res.json({ id: user.id, name: user.name, role: user.role });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/products", requirePosAuth, async (req, res) => {
  try {
    const allProducts = await db.select().from(products).where(eq(products.isActive, true));
    res.json(allProducts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/orders", requirePosAuth, async (req: any, res) => {
  try {
    const { items, paymentMethod, totalAmount, taxAmount } = req.body;
    
    // 1. Create Order
    const [newOrder] = await db.insert(orders).values({
      userId: req.user.id,
      totalAmount,
      taxAmount,
      paymentMethod,
    }).returning();

    // 2. Insert Items
    const orderItemsData = items.map((item: any) => ({
      orderId: newOrder.id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      modifiers: item.modifiers || {}
    }));
    await db.insert(orderItems).values(orderItemsData);

    // 3. ZATCA XML Generation (UBL 2.1)
    const xmlDoc = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('Invoice', { xmlns: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2' })
        .ele('cbc:ID').txt(newOrder.id.toString()).up()
        .ele('cbc:IssueDate').txt(new Date().toISOString().split('T')[0]).up()
        .ele('cbc:InvoiceTypeCode', { name: '0100000' }).txt('388').up()
        .ele('cac:TaxTotal')
          .ele('cbc:TaxAmount', { currencyID: 'SAR' }).txt(taxAmount.toString()).up()
        .up()
        .ele('cac:LegalMonetaryTotal')
          .ele('cbc:TaxInclusiveAmount', { currencyID: 'SAR' }).txt(totalAmount.toString()).up()
        .up()
      .up();
    const xmlString = xmlDoc.end({ prettyPrint: true });
    
    // 4. SHA-256 Hash for QR
    const hash = crypto.createHash('sha256').update(xmlString).digest('base64');
    
    // TLV Base64 QR code generation (Simplified for brevity)
    const sellerName = "NexusCafe";
    const vatNumber = "312345678900003";
    const timestamp = new Date().toISOString();
    // In production, proper TLV encoding is required. Here we mock the TLV buffer.
    const qrBuffer = Buffer.from(sellerName + vatNumber + timestamp + totalAmount + taxAmount);
    const qrBase64 = qrBuffer.toString('base64');
    const qrDataUrl = await QRCode.toDataURL(qrBase64);

    // Update Order with ZATCA data
    await db.update(orders).set({
      zatcaXml: xmlString,
      zatcaQr: qrDataUrl,
      zatcaStatus: 'SUBMITTED' // Mock submission
    }).where(eq(orders.id, newOrder.id));

    res.json({ ...newOrder, zatcaQr: qrDataUrl });
  } catch (error: any) {
    console.error("Order error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/inventory", requirePosAuth, async (req, res) => {
  try {
    const items = await db.select().from(inventoryItems);
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// AI Analytics (Mocking TensorFlow inference endpoint)
app.get("/api/analytics/forecast", requirePosAuth, async (req, res) => {
  try {
    // In a real scenario, we would load the TF.js model and run prediction on recent orders.
    // For this demonstration, we return a mocked forecast shape.
    res.json({
      next7Days: 15200.50,
      next30Days: 62000.00,
      peakHours: ["08:00", "09:00", "13:00"],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -- Vite / Frontend Serving --
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(\`Server running on http://localhost:\${PORT}\`);
  });
}

startServer();
`;

fs.writeFileSync('server.ts', content);
console.log('Restored server.ts');
