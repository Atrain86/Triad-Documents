import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'simple-db.json');

interface SimpleDB {
  projects: any[];
  photos: any[];
  receipts: any[];
  dailyHours: any[];
  counters: {
    projectId: number;
    photoId: number;
    receiptId: number;
    hoursId: number;
  };
}

let db: SimpleDB = {
  projects: [],
  photos: [],
  receipts: [],
  dailyHours: [],
  counters: {
    projectId: 1,
    photoId: 1,
    receiptId: 1,
    hoursId: 1
  }
};

// Load database on startup
try {
  if (fs.existsSync(DB_PATH)) {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    db = JSON.parse(data);
    console.log('Database loaded with', db.photos.length, 'photos');
  }
} catch (error) {
  console.error('Error loading database:', error);
}

export function saveDB() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

export function getDB() {
  return db;
}

export function addPhoto(photo: any) {
  photo.id = db.counters.photoId++;
  db.photos.push(photo);
  saveDB();
  return photo;
}

export function getPhotos(projectId: number) {
  return db.photos.filter(p => p.projectId === projectId);
}

export function addProject(project: any) {
  project.id = db.counters.projectId++;
  db.projects.push(project);
  saveDB();
  return project;
}

export function getProjects() {
  return db.projects;
}