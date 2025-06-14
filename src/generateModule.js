import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const moduleName = process.argv[2];

if (!moduleName) {
  console.error(
    "❌ Please provide a module name.\nUsage: node dist/generateModule.js <moduleName>"
  );
  process.exit(1);
}

const lowerName = moduleName.toLowerCase();
const capitalName = lowerName.charAt(0).toUpperCase() + lowerName.slice(1);

const basePath = join(__dirname);

const folders = {
  controller: join(basePath, "controllers"),
  model: join(basePath, "modals"),
  route: join(basePath, "routes"),
};

for (const folder of Object.values(folders)) {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
}

const files = {
  controller: {
    name: `${lowerName}.controller.ts`,
    content: `// ${capitalName} Controller
import { Request, Response } from 'express';

export const create${capitalName} = (req: Request, res: Response) => {
  res.send('Create ${lowerName}');
};

export const getAll${capitalName}s = (req: Request, res: Response) => {
  res.send('Get all ${lowerName}s');
};

export const get${capitalName}ById = (req: Request, res: Response) => {
  res.send('Get ${lowerName} by ID');
};

export const update${capitalName}ById = (req: Request, res: Response) => {
  res.send('Update ${lowerName} by ID');
};

export const delete${capitalName}ById = (req: Request, res: Response) => {
  res.send('Delete ${lowerName} by ID');
};`,
  },

  model: {
    name: `${lowerName}.model.ts`,
    content: `// ${capitalName} Model
export interface ${capitalName} {
  id: string;
  name: string;
}`,
  },

  route: {
    name: `${lowerName}.route.ts`,
    content: `// ${capitalName} Route
import express from "express";
import {
  create${capitalName},
  getAll${capitalName}s,
  get${capitalName}ById,
  update${capitalName}ById,
  delete${capitalName}ById,
} from "../controllers/${lowerName}.controller";

export default express
  .Router()
  .post("/", create${capitalName})
  .get("/", getAll${capitalName}s)
  .get("/:id", get${capitalName}ById)
  .put("/:id", update${capitalName}ById)
  .delete("/:id", delete${capitalName}ById);`,
  },
};

for (const [type, fileData] of Object.entries(files)) {
  const filePath = join(folders[type], fileData.name);
  fs.writeFileSync(filePath, fileData.content, "utf-8");
  console.log(`✅ Created: ${filePath}`);
}
