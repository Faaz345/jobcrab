const HEALTH_URL = "https://jobcrab-python-scraper.onrender.com/health";

async function poll() {
  console.log("Polling Render health endpoint...");
  for (let i = 0; i < 25; i++) {
    try {
      const res = await fetch(HEALTH_URL);
      if (res.ok) {
        const data = await res.json();
        console.log(`Poll ${i+1}: Version = ${data.version}`);
        if (data.version === "0.1.1-testing-scrapers") {
          console.log("SUCCESS! Render has successfully built and deployed the new code!");
          break;
        }
      } else {
        console.log(`Poll ${i+1}: Render returned status ${res.status}`);
      }
    } catch (err) {
      console.log(`Poll ${i+1}: Render is down/building (Error: ${err.message})`);
    }
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
}

poll();
