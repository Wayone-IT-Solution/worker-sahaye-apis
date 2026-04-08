#!/usr/bin/env node

/**
 * Compare JSON (DB data) vs XLSX (Bulk Upload data)
 * Match by MOBILE NUMBER with space normalization
 * Find records in XLSX that are NOT in JSON
 */

const fs = require("fs");
const XLSX = require("xlsx");

async function main() {
  try {
    console.log("╔═══════════════════════════════════════════════════╗");
    console.log("║  COMPARING DB vs BULK UPLOAD (Mobile Normalized)  ║");
    console.log("╚═══════════════════════════════════════════════════╝\n");

    // ===== STEP 1: READ JSON FILE (DB DATA) =====
    console.log("📂 Reading JSON file (DB data)...");
    const jsonFile = "../workerSahaye.users.json";
    
    if (!fs.existsSync(jsonFile)) {
      console.log("❌ JSON file not found at:", jsonFile);
      return;
    }

    const jsonContent = fs.readFileSync(jsonFile, "utf-8");
    const jsonData = JSON.parse(jsonContent);
    console.log(`✅ Loaded ${jsonData.length} records from JSON\n`);

    // Function to normalize mobile (remove all spaces and non-digits)
    const normalizeMobile = (mobile) => {
      return String(mobile || "").trim().replace(/\s+/g, "").replace(/\D/g, "");
    };

    // Create maps with normalized mobile numbers
    const dbByNormalizedMobile = new Map();
    const dbByNameMobileNormalized = new Map();

    jsonData.forEach((record) => {
      const mobile = normalizeMobile(record.mobile);
      const fullName = String(record.fullName || record.name || "").trim().toLowerCase();
      
      if (mobile && mobile.length >= 10) { // Valid mobile should have at least 10 digits
        dbByNormalizedMobile.set(mobile, record);
        
        if (fullName) {
          const key = `${fullName}|${mobile}`;
          dbByNameMobileNormalized.set(key, record);
        }
      }
    });

    console.log(`📊 DB Map created (with normalized mobiles):`);
    console.log(`   - By Normalized Mobile: ${dbByNormalizedMobile.size} unique numbers`);
    console.log(`   - By FullName|Normalized Mobile: ${dbByNameMobileNormalized.size} combinations\n`);

    // ===== STEP 2: READ EXCEL FILE (BULK UPLOAD DATA) =====
    console.log("📂 Reading Excel file (bulk upload)...");
    const excelFile = "../bulkupload (55).xlsx";

    if (!fs.existsSync(excelFile)) {
      console.log("❌ Excel file not found at:", excelFile);
      return;
    }

    const workbook = XLSX.readFile(excelFile);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const excelData = XLSX.utils.sheet_to_json(sheet);
    console.log(`✅ Loaded ${excelData.length} records from Excel\n`);

    // ===== STEP 3: COMPARE AND FIND MISSING RECORDS =====
    console.log("🔍 Comparing records with normalized mobile numbers...\n");

    const missingRecords = [];
    const matchedByNameMobile = [];
    const matchedByMobileOnly = [];
    const noMobileInExcel = [];

    excelData.forEach((excelRecord) => {
      const normalizedMobile = normalizeMobile(excelRecord.mobile);
      const fullName = String(excelRecord.fullName || "").trim().toLowerCase();

      if (!normalizedMobile || normalizedMobile.length < 10) {
        // Invalid mobile number
        noMobileInExcel.push({
          ...excelRecord,
          _reason: "Invalid or missing mobile number"
        });
      } else {
        const key = `${fullName}|${normalizedMobile}`;
        
        if (dbByNameMobileNormalized.has(key)) {
          // Matched by both name and mobile
          matchedByNameMobile.push(excelRecord);
        } else if (dbByNormalizedMobile.has(normalizedMobile)) {
          // Matched by mobile only
          matchedByMobileOnly.push(excelRecord);
        } else {
          // Not found in DB
          missingRecords.push({
            ...excelRecord,
            _reason: "Mobile number not found in DB"
          });
        }
      }
    });

    // ===== STEP 4: DISPLAY RESULTS =====
    console.log("═══════════════════════════════════════════════════\n");
    console.log("📊 COMPARISON RESULTS:\n");
    console.log(`   ✅ Matched by FullName+Mobile: ${matchedByNameMobile.length}`);
    console.log(`   ✅ Matched by Mobile only:     ${matchedByMobileOnly.length}`);
    console.log(`   ❌ Missing (NOT in DB):        ${missingRecords.length}`);
    console.log(`   ⚠️  Invalid/No mobile:         ${noMobileInExcel.length}`);
    console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   📈 Total in Excel:             ${excelData.length}\n`);

    // Show summary by category
    console.log("📈 Match Summary by UserType:\n");
    const matchedByType = {};
    const missingByType = {};

    excelData.forEach((record) => {
      const type = record.userType || "unknown";
      const normalizedMobile = normalizeMobile(record.mobile);
      const fullName = String(record.fullName || "").trim().toLowerCase();
      const key = `${fullName}|${normalizedMobile}`;

      if (!matchedByType[type]) matchedByType[type] = 0;
      if (!missingByType[type]) missingByType[type] = 0;

      if (normalizedMobile && normalizedMobile.length >= 10) {
        if (dbByNameMobileNormalized.has(key) || dbByNormalizedMobile.has(normalizedMobile)) {
          matchedByType[type]++;
        } else {
          missingByType[type]++;
        }
      }
    });

    Object.entries(matchedByType).forEach(([type, count]) => {
      const missing = missingByType[type] || 0;
      const total = count + missing;
      console.log(`   ${type}: ${count}/${total} matched, ${missing} missing`);
    });
    console.log();

    // Show sample of missing records
    if (missingRecords.length > 0) {
      console.log("🔍 Sample MISSING records (first 15):\n");
      missingRecords.slice(0, 15).forEach((record, idx) => {
        console.log(`${idx + 1}. ${record.fullName} | Mobile: ${record.mobile}`);
        console.log(`   Type: ${record.userType}, Status: ${record.status}, Category: ${record.workerCategory}`);
      });
      console.log();

      if (missingRecords.length > 15) {
        console.log(`\n... and ${missingRecords.length - 15} more missing records\n`);
      }
    }

    // ===== STEP 5: CREATE OUTPUT EXCEL FILE =====
    console.log("💾 Creating detailed report...\n");

    const wb = XLSX.utils.book_new();

    // Sheet 1: Missing Records (RED ALERT!)
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(missingRecords),
      "❌ MISSING Records"
    );

    // Sheet 2: Matched by Name+Mobile
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(matchedByNameMobile),
      "✅ Matched Name+Mobile"
    );

    // Sheet 3: Matched by Mobile Only
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(matchedByMobileOnly),
      "✅ Matched Mobile Only"
    );

    // Sheet 4: Invalid Mobile
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(noMobileInExcel),
      "⚠️ Invalid Mobile"
    );

    // Sheet 5: Summary
    const summary = [
      { Metric: "Total Records in Excel", Count: excelData.length },
      { Metric: "Matched by FullName+Mobile", Count: matchedByNameMobile.length },
      { Metric: "Matched by Mobile Only", Count: matchedByMobileOnly.length },
      { Metric: "Missing (NOT in DB)", Count: missingRecords.length },
      { Metric: "Invalid/No Mobile", Count: noMobileInExcel.length },
      { Metric: "", Count: "" },
      { Metric: "Total DB Records", Count: jsonData.length },
      { Metric: "DB Unique (Normalized) Mobiles", Count: dbByNormalizedMobile.size },
    ];

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(summary),
      "Summary"
    );

    // Save
    const outputFile = "../missing_records_report.xlsx";
    XLSX.writeFile(wb, outputFile);
    console.log(`✅ Report saved to: ${outputFile}\n`);

    console.log("═══════════════════════════════════════════════════\n");

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
