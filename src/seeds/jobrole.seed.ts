import mongoose from "mongoose";
import { JobRole } from "../modals/jobrole.model";
import JobCategory from "../modals/jobcategory.model";

/**
 * Generate URL-friendly slug from name
 */
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
};

/**
 * Job roles mapping by category
 */
const jobRolesByCategory: { [key: string]: Array<{ name: string; description: string; minExp: number; minSalary: number; maxSalary: number }> } = {
  "Information Technology": [
    { name: "Software Engineer", description: "Design, develop, and maintain software applications", minExp: 2, minSalary: 400000, maxSalary: 1200000 },
    { name: "Senior Software Engineer", description: "Lead development of complex systems and mentor teams", minExp: 5, minSalary: 800000, maxSalary: 2000000 },
    { name: "Full Stack Developer", description: "Develop frontend and backend components", minExp: 3, minSalary: 500000, maxSalary: 1400000 },
    { name: "DevOps Engineer", description: "Manage infrastructure and deployment pipelines", minExp: 3, minSalary: 600000, maxSalary: 1500000 },
    { name: "Data Scientist", description: "Analyze data and build predictive models", minExp: 3, minSalary: 600000, maxSalary: 1500000 },
  ],
  "Artificial Intelligence": [
    { name: "AI Engineer", description: "Develop AI and machine learning solutions", minExp: 3, minSalary: 700000, maxSalary: 1800000 },
    { name: "Machine Learning Engineer", description: "Build and deploy ML models", minExp: 2, minSalary: 600000, maxSalary: 1500000 },
    { name: "AI Research Scientist", description: "Conduct AI research and innovation", minExp: 4, minSalary: 800000, maxSalary: 2000000 },
  ],
  "Cybersecurity": [
    { name: "Security Engineer", description: "Implement and maintain security systems", minExp: 3, minSalary: 600000, maxSalary: 1500000 },
    { name: "Penetration Tester", description: "Test system security and identify vulnerabilities", minExp: 3, minSalary: 650000, maxSalary: 1600000 },
  ],
  "Data Analytics": [
    { name: "Data Analyst", description: "Analyze data to provide business insights", minExp: 1, minSalary: 350000, maxSalary: 800000 },
    { name: "Analytics Engineer", description: "Build data pipelines and analytics systems", minExp: 2, minSalary: 500000, maxSalary: 1200000 },
  ],
  "Banking & Finance": [
    { name: "Financial Analyst", description: "Analyze financial data and provide recommendations", minExp: 2, minSalary: 400000, maxSalary: 900000 },
    { name: "Investment Banker", description: "Manage investments and financial portfolios", minExp: 3, minSalary: 600000, maxSalary: 1500000 },
    { name: "Credit Analyst", description: "Assess credit risk and loan applications", minExp: 2, minSalary: 350000, maxSalary: 800000 },
  ],
  "Sales & Marketing": [
    { name: "Sales Executive", description: "Drive sales and manage client relationships", minExp: 1, minSalary: 300000, maxSalary: 900000 },
    { name: "Marketing Manager", description: "Develop and execute marketing strategies", minExp: 3, minSalary: 450000, maxSalary: 1200000 },
    { name: "Brand Manager", description: "Manage brand identity and marketing campaigns", minExp: 3, minSalary: 500000, maxSalary: 1300000 },
  ],
  "Digital Marketing": [
    { name: "Digital Marketing Specialist", description: "Execute digital marketing campaigns", minExp: 1, minSalary: 300000, maxSalary: 700000 },
    { name: "Content Strategist", description: "Create and manage content strategy", minExp: 2, minSalary: 350000, maxSalary: 800000 },
    { name: "SEO Specialist", description: "Optimize websites for search engines", minExp: 1, minSalary: 300000, maxSalary: 700000 },
  ],
  "Content Writing": [
    { name: "Content Writer", description: "Create engaging written content", minExp: 0, minSalary: 250000, maxSalary: 600000 },
    { name: "Technical Writer", description: "Write technical documentation", minExp: 2, minSalary: 350000, maxSalary: 800000 },
    { name: "Copywriter", description: "Write marketing copy and advertisements", minExp: 1, minSalary: 300000, maxSalary: 700000 },
  ],
  "Product Management": [
    { name: "Product Manager", description: "Manage product lifecycle and strategy", minExp: 3, minSalary: 700000, maxSalary: 1800000 },
    { name: "Associate Product Manager", description: "Support product development and management", minExp: 0, minSalary: 400000, maxSalary: 900000 },
  ],
  "Healthcare & Medical": [
    { name: "Doctor", description: "Provide medical care and treatment", minExp: 5, minSalary: 600000, maxSalary: 1500000 },
    { name: "Nurse", description: "Provide patient care and support", minExp: 0, minSalary: 300000, maxSalary: 700000 },
    { name: "Medical Technician", description: "Operate medical equipment and assist doctors", minExp: 1, minSalary: 250000, maxSalary: 600000 },
  ],
  "Nursing Services": [
    { name: "Registered Nurse", description: "Provide professional nursing care", minExp: 0, minSalary: 350000, maxSalary: 800000 },
    { name: "Nurse Manager", description: "Manage nursing team and operations", minExp: 3, minSalary: 500000, maxSalary: 1100000 },
  ],
  "Pharmacy": [
    { name: "Pharmacist", description: "Dispense medication and provide health advice", minExp: 0, minSalary: 350000, maxSalary: 800000 },
    { name: "Pharmacy Technician", description: "Assist pharmacists in medication management", minExp: 0, minSalary: 250000, maxSalary: 500000 },
  ],
  "Mental Health": [
    { name: "Psychiatrist", description: "Provide mental health treatment", minExp: 5, minSalary: 600000, maxSalary: 1400000 },
    { name: "Psychologist", description: "Provide psychological counseling and therapy", minExp: 2, minSalary: 400000, maxSalary: 900000 },
  ],
  "Human Resources": [
    { name: "HR Manager", description: "Manage human resources and recruitment", minExp: 3, minSalary: 400000, maxSalary: 900000 },
    { name: "Recruitment Specialist", description: "Recruit and hire talent", minExp: 1, minSalary: 300000, maxSalary: 700000 },
    { name: "HR Coordinator", description: "Support HR operations and administration", minExp: 0, minSalary: 250000, maxSalary: 500000 },
  ],
  "Architecture & Design": [
    { name: "Architect", description: "Design buildings and structures", minExp: 3, minSalary: 600000, maxSalary: 1400000 },
    { name: "Interior Designer", description: "Design interior spaces and environments", minExp: 2, minSalary: 400000, maxSalary: 1000000 },
    { name: "Landscape Architect", description: "Design outdoor spaces and landscapes", minExp: 3, minSalary: 500000, maxSalary: 1200000 },
  ],
  "Graphic Design": [
    { name: "Graphic Designer", description: "Create visual designs and layouts", minExp: 1, minSalary: 300000, maxSalary: 800000 },
    { name: "UX/UI Designer", description: "Design user interfaces and experiences", minExp: 2, minSalary: 400000, maxSalary: 1000000 },
    { name: "Motion Designer", description: "Create animated graphics and motion content", minExp: 2, minSalary: 350000, maxSalary: 900000 },
  ],
  "Education & Training": [
    { name: "Teacher", description: "Teach students and facilitate learning", minExp: 0, minSalary: 300000, maxSalary: 700000 },
    { name: "Training Manager", description: "Develop and deliver training programs", minExp: 2, minSalary: 400000, maxSalary: 900000 },
    { name: "Academic Coordinator", description: "Coordinate academic programs and operations", minExp: 1, minSalary: 300000, maxSalary: 700000 },
  ],
  "Consulting": [
    { name: "Management Consultant", description: "Provide business consulting and strategy", minExp: 3, minSalary: 700000, maxSalary: 1800000 },
    { name: "Business Analyst", description: "Analyze business requirements and propose solutions", minExp: 2, minSalary: 400000, maxSalary: 1000000 },
  ],
  "Project Management": [
    { name: "Project Manager", description: "Manage projects and teams", minExp: 3, minSalary: 600000, maxSalary: 1400000 },
    { name: "Scrum Master", description: "Facilitate agile development and team coordination", minExp: 2, minSalary: 500000, maxSalary: 1200000 },
  ],
  "Supply Chain Management": [
    { name: "Supply Chain Manager", description: "Manage supply chain and logistics", minExp: 3, minSalary: 600000, maxSalary: 1400000 },
    { name: "Logistics Coordinator", description: "Coordinate logistics and shipping operations", minExp: 1, minSalary: 300000, maxSalary: 700000 },
  ],
  "Transportation & Logistics": [
    { name: "Logistics Manager", description: "Manage logistics operations and distribution", minExp: 3, minSalary: 600000, maxSalary: 1300000 },
    { name: "Fleet Manager", description: "Manage fleet of vehicles and drivers", minExp: 3, minSalary: 500000, maxSalary: 1200000 },
  ],
  "Hospitality & Tourism": [
    { name: "Hotel Manager", description: "Manage hotel operations and staff", minExp: 3, minSalary: 450000, maxSalary: 1100000 },
    { name: "Event Manager", description: "Plan and execute events", minExp: 2, minSalary: 350000, maxSalary: 900000 },
    { name: "Tour Guide", description: "Guide tourists and provide information", minExp: 0, minSalary: 250000, maxSalary: 600000 },
  ],
  "Event Management": [
    { name: "Event Coordinator", description: "Coordinate event planning and execution", minExp: 1, minSalary: 300000, maxSalary: 700000 },
    { name: "Events Manager", description: "Manage large-scale events and productions", minExp: 3, minSalary: 500000, maxSalary: 1200000 },
  ],
  "Retail & E-commerce": [
    { name: "Retail Manager", description: "Manage retail store operations", minExp: 2, minSalary: 350000, maxSalary: 800000 },
    { name: "E-commerce Manager", description: "Manage online retail operations", minExp: 2, minSalary: 400000, maxSalary: 1000000 },
    { name: "Store Associate", description: "Assist customers and manage inventory", minExp: 0, minSalary: 200000, maxSalary: 400000 },
  ],
  "Food & Beverage": [
    { name: "Chef", description: "Prepare and cook food items", minExp: 2, minSalary: 350000, maxSalary: 900000 },
    { name: "Food Service Manager", description: "Manage food and beverage operations", minExp: 2, minSalary: 350000, maxSalary: 800000 },
    { name: "Sommelier", description: "Select and serve wines", minExp: 1, minSalary: 300000, maxSalary: 700000 },
  ],
  "Construction & Real Estate": [
    { name: "Construction Manager", description: "Manage construction projects", minExp: 3, minSalary: 600000, maxSalary: 1400000 },
    { name: "Real Estate Agent", description: "Buy, sell, and lease properties", minExp: 0, minSalary: 300000, maxSalary: 900000 },
    { name: "Property Manager", description: "Manage properties and tenants", minExp: 2, minSalary: 400000, maxSalary: 900000 },
  ],
  "Automotive": [
    { name: "Automotive Engineer", description: "Design and develop automotive systems", minExp: 3, minSalary: 600000, maxSalary: 1400000 },
    { name: "Mechanic", description: "Repair and maintain vehicles", minExp: 1, minSalary: 250000, maxSalary: 600000 },
  ],
  "Aviation": [
    { name: "Pilot", description: "Operate aircraft and ensure passenger safety", minExp: 5, minSalary: 800000, maxSalary: 2000000 },
    { name: "Flight Attendant", description: "Serve passengers and ensure safety on flights", minExp: 0, minSalary: 300000, maxSalary: 700000 },
    { name: "Aviation Engineer", description: "Maintain aircraft systems and equipment", minExp: 3, minSalary: 600000, maxSalary: 1400000 },
  ],
  "Media & Entertainment": [
    { name: "Video Editor", description: "Edit and produce video content", minExp: 1, minSalary: 300000, maxSalary: 800000 },
    { name: "Producer", description: "Produce films, shows, or content", minExp: 3, minSalary: 500000, maxSalary: 1300000 },
    { name: "Journalist", description: "Report news and write articles", minExp: 1, minSalary: 300000, maxSalary: 800000 },
  ],
  "Music & Audio": [
    { name: "Audio Engineer", description: "Produce and mix audio content", minExp: 2, minSalary: 350000, maxSalary: 900000 },
    { name: "Music Producer", description: "Produce and arrange music", minExp: 2, minSalary: 400000, maxSalary: 1000000 },
  ],
  "Sports & Fitness": [
    { name: "Fitness Coach", description: "Guide fitness training and workouts", minExp: 1, minSalary: 250000, maxSalary: 600000 },
    { name: "Sports Manager", description: "Manage sports teams and athletes", minExp: 2, minSalary: 400000, maxSalary: 1000000 },
  ],
  "Beauty & Wellness": [
    { name: "Beautician", description: "Provide beauty and cosmetic services", minExp: 0, minSalary: 200000, maxSalary: 500000 },
    { name: "Wellness Coach", description: "Guide health and wellness programs", minExp: 1, minSalary: 300000, maxSalary: 700000 },
  ],
  "Government & Public Service": [
    { name: "Civil Servant", description: "Work in government administration", minExp: 0, minSalary: 350000, maxSalary: 800000 },
    { name: "Policy Analyst", description: "Analyze and develop public policies", minExp: 2, minSalary: 400000, maxSalary: 1000000 },
  ],
  "Legal Services": [
    { name: "Lawyer", description: "Provide legal services and representation", minExp: 3, minSalary: 600000, maxSalary: 1500000 },
    { name: "Legal Consultant", description: "Consult on legal matters", minExp: 3, minSalary: 500000, maxSalary: 1300000 },
  ],
  "Accounting": [
    { name: "Accountant", description: "Manage financial records and accounts", minExp: 1, minSalary: 300000, maxSalary: 700000 },
    { name: "Chartered Accountant", description: "Provide accounting and audit services", minExp: 3, minSalary: 600000, maxSalary: 1400000 },
  ],
  "Business Development": [
    { name: "Business Development Manager", description: "Identify and develop business opportunities", minExp: 2, minSalary: 450000, maxSalary: 1100000 },
    { name: "Sales Manager", description: "Manage sales team and operations", minExp: 3, minSalary: 500000, maxSalary: 1200000 },
  ],
};

export const seedJobRoles = async () => {
  try {
    // Check if roles already exist
    const existingCount = await JobRole.countDocuments();
    if (existingCount > 0) {
      console.log(`✅ Job roles already exist in database (${existingCount} found)`);
      return;
    }

    // Get all job categories
    const categories = await JobCategory.find();
    console.log(`📚 Found ${categories.length} job categories`);

    const allRoles: any[] = [];

    // Create roles for each category
    for (const category of categories) {
      const categoryName = category.name;
      const roles = jobRolesByCategory[categoryName] || [];

      if (roles.length > 0) {
        console.log(`   📝 Creating ${roles.length} roles for "${categoryName}"`);
        
        roles.forEach((role) => {
          allRoles.push({
            name: role.name,
            slug: generateSlug(role.name),
            description: role.description,
            category: category._id,
            salaryRange: {
              min: role.minSalary,
              max: role.maxSalary,
              currency: "INR",
            },
            requiredExperience: role.minExp,
            tags: [categoryName.toLowerCase().replace(/\s+/g, "-"), "active"],
            status: "active",
          });
        });
      } else {
        // Create a default role for categories without specific roles
        const defaultName = `${categoryName} Specialist`;
        allRoles.push({
          name: defaultName,
          slug: generateSlug(defaultName),
          description: `Professional in ${categoryName}`,
          category: category._id,
          salaryRange: {
            min: 300000,
            max: 800000,
            currency: "INR",
          },
          requiredExperience: 1,
          tags: [categoryName.toLowerCase().replace(/\s+/g, "-"), "active"],
          status: "active",
        });
      }
    }

    // Insert all roles
    const result = await JobRole.insertMany(allRoles);
    console.log(`✅ Successfully inserted ${result.length} job roles into database`);
    return result;
  } catch (error: any) {
    console.error(`❌ Error seeding job roles:`, error.message);
    throw error;
  }
};
