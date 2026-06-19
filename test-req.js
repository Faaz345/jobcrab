const http = require('http');

const data = JSON.stringify({
  title: "Software Engineer",
  experience: 5,
  location: "New York",
  education: "BS CS",
  skills: "TypeScript",
  workHistory: "Worked at tech company"
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/onboarding/generate-resume',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('Status:', res.statusCode, 'Body:', body));
});

req.on('error', e => console.error(e));
req.write(data);
req.end();
