describe("Complete Login Test with API Testing", () => {
  
  // Test 1: การ Intercept และบันทึกข้อมูล
  it("should intercept login and save data", () => {
    const interceptedData = [];
    
    cy.intercept("POST", "https://robot-lab.onrender.com/api/**", (req) => {
      req.continue((res) => {
        interceptedData.push({
          url: req.url,
          method: req.method,
          requestBody: req.body,
          responseBody: res.body,
          statusCode: res.statusCode,
          timestamp: new Date().toISOString(),
          description: "Intercepted from UI login"
        });
      });
    }).as("anyApiPost");

    cy.visit("https://robot-lab-five.vercel.app/");
    cy.get(".logo").should("have.text", "Lobot Framework Lab");
    cy.wait(3000);
    cy.get(".nav-btn-login").click();
    cy.wait(2000);
    cy.get("#loginEmail").type("boss2@gmail.com");
    cy.wait(2000);
    cy.get("#loginPassword").type("password1234");
    cy.wait(2000);
    cy.get("form > button").click({ force: true });
    cy.wait("@anyApiPost");
    
    cy.get(".message")
      .invoke("text")
      .then((text) => {
        cy.log(text);
      });
    cy.get(".message").should("have.text", "Login successful! Welcome, Boss!");

    // สร้างข้อมูลทดสอบ 10 Email
    cy.then(() => {
      const testEmails = [
        {
          url: "https://robot-lab.onrender.com/api/auth/login",
          method: "POST",
          requestBody: { email: "boss2@gmail.com", password: "password1234" },
          expectedStatus: 200,
          description: "Valid admin account (from intercept)"
        },
        {
          url: "https://robot-lab.onrender.com/api/auth/login",
          method: "POST",
          requestBody: { email: "user1@example.com", password: "password123" },
          expectedStatus: 401,
          description: "Test user account 1"
        },
        {
          url: "https://robot-lab.onrender.com/api/auth/login",
          method: "POST",
          requestBody: { email: "user2@example.com", password: "password123" },
          expectedStatus: 401,
          description: "Test user account 2"
        },
        {
          url: "https://robot-lab.onrender.com/api/auth/login",
          method: "POST",
          requestBody: { email: "manager@company.com", password: "manager2024" },
          expectedStatus: 401,
          description: "Manager account"
        },
        {
          url: "https://robot-lab.onrender.com/api/auth/login",
          method: "POST",
          requestBody: { email: "test@cypress.io", password: "testpass123" },
          expectedStatus: 401,
          description: "Cypress test account"
        },
        {
          url: "https://robot-lab.onrender.com/api/auth/login",
          method: "POST",
          requestBody: { email: "demo@demo.com", password: "demopass" },
          expectedStatus: 401,
          description: "Demo account with weak password"
        },
        {
          url: "https://robot-lab.onrender.com/api/auth/login",
          method: "POST",
          requestBody: { email: "inactive@example.com", password: "password123" },
          expectedStatus: 401,
          description: "Inactive user account"
        },
        {
          url: "https://robot-lab.onrender.com/api/auth/login",
          method: "POST",
          requestBody: { email: "wrongpassword@example.com", password: "wrongpass" },
          expectedStatus: 401,
          description: "Wrong password test"
        },
        {
          url: "https://robot-lab.onrender.com/api/auth/login",
          method: "POST",
          requestBody: { email: "notexist@example.com", password: "password123" },
          expectedStatus: 401,
          description: "Non-existent email"
        },
        {
          url: "https://robot-lab.onrender.com/api/auth/login",
          method: "POST",
          requestBody: { email: "admin@system.com", password: "admin123" },
          expectedStatus: 401,
          description: "Fake admin account"
        }
      ];

      // ถ้ามีข้อมูล intercepted ให้ใช้ข้อมูลจริง สำหรับ email แรก
      if (interceptedData.length > 0) {
        testEmails[0] = {
          ...interceptedData[0],
          expectedStatus: interceptedData[0].statusCode,
          description: "Real intercepted data from UI"
        };
      }

      cy.writeFile("cypress/fixtures/intercepted_post_data.json", testEmails, { log: true });
      cy.log("✅ Test data file created with 10 email accounts");
    });
  });

  // Test 2: ทดสอบ API 10 รอบด้วยข้อมูลเดิม
  it("should test API 10 times with same credentials", () => {
    cy.fixture("intercepted_post_data.json").then((testData) => {
      const validLogin = testData.find(data => data.expectedStatus === 200) || testData[0];
      
      cy.log("=== Testing API 10 consecutive calls ===");
      cy.log(`Testing with: ${validLogin.requestBody.email}`);

      // สร้าง array สำหรับเก็บผลลัพธ์
      const results = [];

      // Loop ทดสอบ 10 รอบ
      for (let i = 1; i <= 10; i++) {
        cy.request({
          method: validLogin.method,
          url: validLogin.url,
          body: validLogin.requestBody,
          failOnStatusCode: false,
        }).then((response) => {
          const result = {
            attempt: i,
            statusCode: response.status,
            duration: response.duration,
            timestamp: new Date().toISOString(),
            hasToken: response.body && response.body.token ? true : false,
            responseSize: JSON.stringify(response.body).length
          };

          results.push(result);

          cy.log(`🔄 Attempt ${i}:`);
          cy.log(`   Status: ${response.status}`);
          cy.log(`   Duration: ${response.duration}ms`);
          cy.log(`   Has Token: ${result.hasToken}`);

          // ตรวจสอบผลลัพธ์
          if (response.status === 200) {
            expect(response.body).to.have.property('email');
            cy.log(`   ✅ Login successful`);
          } else if (response.status === 401) {
            cy.log(`   ❌ Unauthorized`);
          } else if (response.status === 429) {
            cy.log(`   ⚠️ Rate limited`);
          } else {
            cy.log(`   ⚠️ Unexpected status: ${response.status}`);
          }

          // หลังจากครบ 10 รอบ บันทึกผลสรุป
          if (i === 10) {
            cy.then(() => {
              const summary = {
                totalAttempts: 10,
                successful: results.filter(r => r.statusCode === 200).length,
                unauthorized: results.filter(r => r.statusCode === 401).length,
                rateLimited: results.filter(r => r.statusCode === 429).length,
                averageDuration: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
                results: results
              };

              cy.writeFile("cypress/fixtures/api_test_results.json", summary, { log: true });
              
              cy.log("=== SUMMARY ===");
              cy.log(`✅ Successful: ${summary.successful}/10`);
              cy.log(`❌ Unauthorized: ${summary.unauthorized}/10`);
              cy.log(`⚠️ Rate Limited: ${summary.rateLimited}/10`);
              cy.log(`⏱️ Average Duration: ${summary.averageDuration.toFixed(2)}ms`);
            });
          }
        });
      }
    });
  });

  // Test 3: ทดสอบกับ Email ทั้ง 10 ตัว
  it("should test all 10 email accounts", () => {
    cy.fixture("intercepted_post_data.json").then((testData) => {
      cy.log("=== Testing All 10 Email Accounts ===");

      const testResults = [];

      testData.forEach((loginData, index) => {
        cy.request({
          method: loginData.method,
          url: loginData.url,
          body: loginData.requestBody,
          failOnStatusCode: false,
        }).then((response) => {
          const result = {
            email: loginData.requestBody.email,
            expectedStatus: loginData.expectedStatus,
            actualStatus: response.status,
            success: response.status === loginData.expectedStatus,
            duration: response.duration,
            description: loginData.description,
            timestamp: new Date().toISOString()
          };

          testResults.push(result);

          cy.log(`📧 Email ${index + 1}: ${loginData.requestBody.email}`);
          cy.log(`   Expected: ${loginData.expectedStatus} | Actual: ${response.status}`);
          cy.log(`   Result: ${result.success ? '✅ PASS' : '❌ FAIL'}`);
          cy.log(`   Description: ${loginData.description}`);

          // ตรวจสอบตามที่คาดหวัง
          if (loginData.expectedStatus === 200) {
            if (response.status === 200) {
              expect(response.body).to.have.property('email');
            }
          } else {
            expect(response.status).to.not.eq(200);
          }

          // บันทึกผลสรุปหลังจากทดสอบครบ
          if (index === testData.length - 1) {
            cy.then(() => {
              const summary = {
                totalTests: testResults.length,
                passed: testResults.filter(r => r.success).length,
                failed: testResults.filter(r => !r.success).length,
                averageDuration: testResults.reduce((sum, r) => sum + r.duration, 0) / testResults.length,
                testResults: testResults,
                timestamp: new Date().toISOString()
              };

              cy.writeFile("cypress/fixtures/email_test_results.json", summary, { log: true });
              
              cy.log("=== FINAL SUMMARY ===");
              cy.log(`📊 Total Tests: ${summary.totalTests}`);
              cy.log(`✅ Passed: ${summary.passed}`);
              cy.log(`❌ Failed: ${summary.failed}`);
              cy.log(`📈 Pass Rate: ${((summary.passed/summary.totalTests)*100).toFixed(1)}%`);
              cy.log(`⏱️ Average Duration: ${summary.averageDuration.toFixed(2)}ms`);
            });
          }
        });
      });
    });
  });

  // Test 4: ทดสอบ Performance และ Rate Limiting
  it("should test performance and rate limiting", () => {
    cy.fixture("intercepted_post_data.json").then((testData) => {
      const validLogin = testData.find(data => data.expectedStatus === 200) || testData[0];
      
      cy.log("=== Performance and Rate Limiting Test ===");

      // ทดสอบการยิงพร้อมกัน (concurrent requests)
      const concurrentRequests = [];
      
      for (let i = 1; i <= 5; i++) {
        const requestPromise = cy.request({
          method: validLogin.method,
          url: validLogin.url,
          body: validLogin.requestBody,
          failOnStatusCode: false,
        });
        concurrentRequests.push(requestPromise);
      }

      // รอให้ทุก request เสร็จ
      cy.then(() => {
        Promise.all(concurrentRequests).then((responses) => {
          const performanceData = responses.map((response, index) => ({
            requestNumber: index + 1,
            statusCode: response.status,
            duration: response.duration,
            timestamp: new Date().toISOString()
          }));

          cy.writeFile("cypress/fixtures/performance_test_results.json", {
            testType: "Concurrent Requests",
            totalRequests: 5,
            results: performanceData,
            timestamp: new Date().toISOString()
          }, { log: true });

          cy.log("=== Concurrent Requests Results ===");
          performanceData.forEach(data => {
            cy.log(`Request ${data.requestNumber}: ${data.statusCode} (${data.duration}ms)`);
          });
        });
      });
    });
  });
});