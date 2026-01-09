import mongoose from "mongoose";
import { Header, ParentEnum } from "../../modals/header.model";
import { config } from "../../config/config";

// MongoDB connection string
const MONGO_URI = `${config.db.url}/${config.db.name}`;

// Sample data
// const headersData = [
//   { title: "EPF Act in Simple Words", parent: ParentEnum.EPFO, description: "Understand the EPF & MP Act, 1952" },
//   { title: "FAQs", parent: ParentEnum.EPFO, description: "Common questions about EPF" },
//   { title: "PF Calculator", parent: ParentEnum.EPFO, description: "Estimate your EPF contributions & benefits" },
//   { title: "Eligibility & Rules", parent: ParentEnum.EPFO, description: "Who is covered and what are the rules" },
//   { title: "Forms & Downloads", parent: ParentEnum.EPFO, description: "Claim, KYC, transfer forms" },
//   { title: "Step-by-Step Guides", parent: ParentEnum.EPFO, description: "How to use and claim EPF services" },
// ];


// const headersData = [
  // { title: "About ESI", parent: ParentEnum.ESIC, description: "The Employees’ State Insurance (ESI)." },
  // { title: "Benefits Overview", parent: ParentEnum.ESIC, description: "Medical Benefit" },
  // { title: "Contribution & Eligibility", parent: ParentEnum.ESIC, description: "Common questions about EPF" },
  // { title: "Pehchan Card & ID", parent: ParentEnum.ESIC, description: "Estimate your EPF contributions & benefits" },
  // { title: "Directory & Locations", parent: ParentEnum.ESIC, description: "Who is covered and what are the rules" },
  // { title: "For Pensioners", parent: ParentEnum.ESIC, description: "Claim, KYC, transfer forms" },
  // { title: "ESIC Act : (PDF/Word upload) & Amendments and Updates", parent: ParentEnum.ESIC, description: "How to use and claim EPF services" },
    // { title: "Latest Updates & Schemes", parent: ParentEnum.ESIC, description: "Claim, KYC, transfer forms" },
  // { title: "FAQs", parent: ParentEnum.ESIC, description: "How to use and claim EPF services" },
// ];


const headersData = [
  { title: "Higher Education Assistance Scheme", parent: ParentEnum.LWF, description: "To encourage children of workers." },
  { title: "Worker Accident Assistance Scheme", parent: ParentEnum.LWF, description: "To provide financial assistance." },
  { title: "Worker Cycle Subsidy Assistance Scheme", parent: ParentEnum.LWF, description: "To assist organized sector." },
  { title: "Women Worker Marriage Assistance Scheme", parent: ParentEnum.LWF, description: "To provide financial assistance to women workers after their marriage." },
  { title: "Educational Award Scheme (Std. 10)", parent: ParentEnum.LWF, description: "To encourage the children of workers for higher education." },
  { title: "Laptop Purchase Assistance Scheme", parent: ParentEnum.LWF, description: "Laptop purchase assistance." },
  { title: "Labourer Funeral Assistance Scheme", parent: ParentEnum.LWF, description: "Labourer’s death" },
  { title: "Labourer Home Town Scheme (Provisional Approval)", parent: ParentEnum.LWF, description: "To reimburse railway fare to organised sector migrant." },
  { title: "Labourer Accidental Death Assistance Scheme", parent: ParentEnum.LWF, description: "Financial assistance to the family." },
  { title: "Educational Award Scheme (Class: 12)", parent: ParentEnum.LWF, description: "Encourage the children of workers" },
  { title: "Labourers’ Comprehensive Medical Examination Assistance Scheme", parent: ParentEnum.LWF, description: "To conduct health check-ups for male labourers." },
 ];
async function seedHeaders() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    // Optional: clear existing headers
    // await Header.deleteMany({});
    // console.log("Existing headers cleared");

    // Insert new headers
    await Header.insertMany(headersData);
    console.log("Headers seeded successfully");
  } catch (err) {
    console.error("Error seeding headers:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run the seed
seedHeaders();
