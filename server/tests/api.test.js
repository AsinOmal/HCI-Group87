process.env.JWT_SECRET = 'testsecret';

const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../index'); 
const User = require('../models/User');

let mongoServer;
let userToken;
let userId;

beforeAll(async () => {
  await mongoose.disconnect();
  
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  const user = new User({ email: 'test@test.com', password: 'hashedpassword' });
  await user.save();
  userId = user._id;

  userToken = jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Designs API', () => {
  it('should return 401 if no token provided', async () => {
    const res = await request(app).get('/api/designs');
    expect(res.statusCode).toEqual(401);
  });

  it('should create a new design via POST /api/designs', async () => {
    const payload = {
      name: 'Test Room',
      room: { width: 5, length: 5, shape: 'Rectangle', wallColor: '#fff', floorColor: '#ccc' },
      furniture: [{ id: '1', type: 'Chair', x: 100, y: 100 }]
    };

    const res = await request(app)
      .post('/api/designs')
      .set('Authorization', `Bearer ${userToken}`)
      .send(payload);

    expect(res.statusCode).toEqual(201);
    expect(res.body.name).toEqual('Test Room');
    expect(res.body._id).toBeDefined();
  });

  it('should fetch all designs via GET /api/designs', async () => {
    const res = await request(app)
      .get('/api/designs')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('should delete a design via DELETE /api/designs/:id', async () => {
    // First create one
    const payload = {
      name: 'To Delete',
      room: { width: 5, length: 5, shape: 'Rectangle', wallColor: '#fff', floorColor: '#ccc' },
      furniture: []
    };
    const createRes = await request(app)
      .post('/api/designs')
      .set('Authorization', `Bearer ${userToken}`)
      .send(payload);
    
    const designId = createRes.body._id;

    // Now delete it
    const deleteRes = await request(app)
      .delete(`/api/designs/${designId}`)
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(deleteRes.statusCode).toEqual(200);
    expect(deleteRes.body.message).toEqual('Design deleted successfully');
  });
});
