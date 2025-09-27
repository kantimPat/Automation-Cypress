describe("test", () => {
  it("should login Fail", () => {
    cy.fixture("intercepted_post_data.json").then((apiData) => {
      const loginRequest = apiData[1];
      expect(loginRequest.statusCode).to.eq(200);
      cy.request({
        method: loginRequest.method,
        url: loginRequest.url,
        body: loginRequest.requestBody,
        failOnStatusCode: false,
      }).then((res) => {
        cy.log("Response Body:", JSON.stringify(res.body, null, 2));
      });
    });
  });
});
