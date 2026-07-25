/**
 * IntegrationGuide.jsx
 * Developer integration guide and code examples
 */

export function IntegrationGuide() {
  return (
    <div className="integration-guide">
      <section className="panel">
        <h1>Integration Guide</h1>
        <p>
          Learn how to integrate FormDock APIs into your website or application.
        </p>

        <section className="card">
          <h2>Table of Contents</h2>
          <ol className="toc">
            <li><a href="#form-submission">Public Form Submission</a></li>
            <li><a href="#faq-chatbot">FAQ Chatbot Integration</a></li>
            <li><a href="#cms-reader">CMS Collection Reader</a></li>
            <li><a href="#authentication">Authentication & Tokens</a></li>
            <li><a href="#error-handling">Error Handling</a></li>
          </ol>
        </section>

        <section id="form-submission" className="card">
          <h2>1. Public Form Submission</h2>
          <p>
            Embed a contact form on your website that submits directly to FormDock.
          </p>

          <h3>Endpoint</h3>
          <code className="code-block">POST /api/forms/submit/</code>

          <h3>HTML Example</h3>
          <pre className="code-example">{`<form id="enquiry-form">
  <input type="text" name="name" placeholder="Your Name" required />
  <input type="email" name="email" placeholder="Your Email" required />
  <textarea name="message" placeholder="Your Message"></textarea>
  <button type="submit">Send</button>
</form>

<script>
const API_KEY = 'YOUR_PUBLIC_API_KEY';
const BACKEND_URL = 'http://localhost:8000';

document.getElementById('enquiry-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const fields = Object.fromEntries(formData);
  
  const response = await fetch(\`\${BACKEND_URL}/api/forms/submit/\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_api_key: API_KEY,
      fields: fields,
      metadata: {
        page_url: window.location.href,
        referrer: document.referrer,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }
    })
  });
  
  const data = await response.json();
  if (response.ok) {
    alert('Thank you! We received your enquiry.');
    e.target.reset();
  } else {
    alert('Error: ' + JSON.stringify(data));
  }
});
</script>`}</pre>

          <h3>Request Format</h3>
          <pre className="code-example">{`{
  "project_api_key": "YOUR_PUBLIC_API_KEY",
  "fields": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "message": "Hello there",
    "custom_field": "custom_value"
  },
  "metadata": {
    "page_url": "https://example.com/contact",
    "referrer": "https://google.com",
    "user_agent": "Mozilla/5.0...",
    "timestamp": "2026-02-08T10:00:00Z"
  }
}`}</pre>

          <h3>Response (202 Accepted)</h3>
          <pre className="code-example">{`{
  "success": true,
  "enquiry_id": "queue_uuid",
  "locked": false,
  "queued": true
}`}</pre>

          <p className="text-muted">
            <strong>Status:</strong> The form is queued for processing. Process may take a few seconds.
          </p>
        </section>

        <section id="faq-chatbot" className="card">
          <h2>2. FAQ Chatbot Integration</h2>
          <p>
            Add an AI-powered FAQ chatbot to your website.
          </p>

          <h3>Endpoint</h3>
          <code className="code-block">POST /api/faq/chat/</code>

          <h3>HTML Example</h3>
          <pre className="code-example">{`<div id="faq-widget">
  <input 
    type="text" 
    id="faq-question" 
    placeholder="Ask a question..."
  />
  <button onclick="askFaq()">Ask</button>
  <div id="faq-answer"></div>
</div>

<script>
const FAQ_API_KEY = 'FAQ_PUBLIC_API_KEY';
const BACKEND_URL = 'http://localhost:8000';

async function askFaq() {
  const question = document.getElementById('faq-question').value;
  if (!question) return;
  
  const response = await fetch(\`\${BACKEND_URL}/api/faq/chat/\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      faq_api_key: FAQ_API_KEY,
      question: question,
      metadata: {
        page_url: window.location.href,
        user_agent: navigator.userAgent
      }
    })
  });
  
  const data = await response.json();
  if (response.ok) {
    document.getElementById('faq-answer').innerHTML = 
      '<h4>Answer:</h4><p>' + data.answer + '</p>';
  } else {
    alert('Error: ' + JSON.stringify(data));
  }
}
</script>`}</pre>

          <h3>Request Format</h3>
          <pre className="code-example">{`{
  "faq_api_key": "FAQ_PUBLIC_API_KEY",
  "question": "What is your refund policy?",
  "metadata": {
    "page_url": "https://example.com/faq",
    "user_agent": "Mozilla/5.0..."
  },
  "include_collections": false
}`}</pre>

          <h3>Response</h3>
          <pre className="code-example">{`{
  "success": true,
  "chat_id": "uuid",
  "answer": "Refunds are available within 7 days for paid plans.",
  "remaining_quota": 49,
  "test_mode": true
}`}</pre>

          <h3>Quota Information</h3>
          <ul className="list-clean">
            <li><strong>Test Mode (Paywall OFF):</strong> 50 chats/day per project</li>
            <li><strong>Paid Plan (Paywall ON):</strong> Depends on subscription plan</li>
            <li><strong>Global Limit:</strong> 100,000 chats/day</li>
          </ul>
        </section>

        <section id="cms-reader" className="card">
          <h2>3. CMS Collection Reader</h2>
          <p>
            Display CMS collection data on your website.
          </p>

          <h3>Endpoint</h3>
          <code className="code-block">
            GET /api/collections/public/{'<'}collection_slug{'>'}
          </code>

          <h3>JavaScript Example</h3>
          <pre className="code-example">{`const API_KEY = 'YOUR_PUBLIC_API_KEY';
const BACKEND_URL = 'http://localhost:8000';

async function loadFaqCollection() {
  const params = new URLSearchParams({
    project_api_key: API_KEY,
    page_url: window.location.href,
    limit: 20,
    page: 1
  });

  const response = await fetch(
    \`\${BACKEND_URL}/api/collections/public/faq_items/?\${params}\`,
    { method: 'GET' }
  );

  const data = await response.json();
  if (response.ok) {
    data.entries.forEach(entry => {
      console.log(entry.data); // { title: '...', answer: '...' }
    });
  }
}

loadFaqCollection();`}</pre>

          <h3>Query Parameters</h3>
          <ul className="list-clean">
            <li><strong>project_api_key:</strong> Your public API key (required)</li>
            <li><strong>page_url:</strong> Current page URL</li>
            <li><strong>limit:</strong> Results per page (default: 20)</li>
            <li><strong>page:</strong> Page number (default: 1)</li>
          </ul>

          <h3>Response</h3>
          <pre className="code-example">{`{
  "success": true,
  "collection": {
    "id": "uuid",
    "name": "faq_items",
    "slug": "faq_items"
  },
  "limit": 20,
  "entries": [
    {
      "id": "uuid",
      "collection": "uuid",
      "data": {
        "title": "What is FormDock?",
        "answer": "FormDock is a form management platform..."
      },
      "created_at": "2026-03-20T12:00:00Z"
    }
  ]
}`}</pre>
        </section>

        <section id="authentication" className="card">
          <h2>4. Authentication & Tokens</h2>

          <h3>Getting JWT Tokens</h3>
          <pre className="code-example">{`// Login
POST /api/auth/token/
{
  "username": "demo",
  "password": "1"
}

Response:
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}

// Use access token for authenticated requests
Authorization: Bearer <access_token>

// Refresh token
POST /api/auth/token/refresh/
{ "refresh": "..." }
`}</pre>

          <h3>Public API Keys</h3>
          <ul className="list-clean">
            <li>
              <strong>Public API Key:</strong> Use with <code>/api/forms/submit/</code> and
              CMS reader
            </li>
            <li>
              <strong>FAQ API Key:</strong> Use with <code>/api/faq/chat/</code>
            </li>
            <li>Found in your project's Overview tab in the dashboard</li>
          </ul>
        </section>

        <section id="error-handling" className="card">
          <h2>5. Error Handling</h2>

          <h3>Common HTTP Status Codes</h3>
          <dl className="kv-list">
            <div>
              <dt>200</dt>
              <dd>Success</dd>
            </div>
            <div>
              <dt>202</dt>
              <dd>Accepted (Request is queued)</dd>
            </div>
            <div>
              <dt>400</dt>
              <dd>Bad request (Invalid parameters)</dd>
            </div>
            <div>
              <dt>401</dt>
              <dd>Unauthorized (Invalid token)</dd>
            </div>
            <div>
              <dt>403</dt>
              <dd>Forbidden (Domain not allowed)</dd>
            </div>
            <div>
              <dt>404</dt>
              <dd>Not found</dd>
            </div>
            <div>
              <dt>429</dt>
              <dd>Rate limit exceeded (Too many requests)</dd>
            </div>
          </dl>

          <h3>Error Response Format</h3>
          <pre className="code-example">{`{
  "success": false,
  "error": "Your error message here",
  "detail": "Additional details if available"
}`}</pre>

          <h3>Error Handling Example</h3>
          <pre className="code-example">{`try {
  const response = await fetch(url, options);
  const data = await response.json();
  
  if (!response.ok) {
    if (response.status === 429) {
      console.error('Rate limited. Try again later.');
    } else if (response.status === 401) {
      console.error('Unauthorized. Check your API key.');
    } else {
      console.error('Error:', data.error || data.detail);
    }
    return;
  }
  
  // Handle success
  console.log('Success:', data);
} catch (err) {
  console.error('Network error:', err.message);
}`}</pre>
        </section>

        <section className="card">
          <h2>Need Help?</h2>
          <p>
            For more information, check our API documentation or create a support
            ticket.
          </p>
          <div className="actions">
            <a href="/support" className="btn">Contact Support</a>
            <a href="/api-docs" className="btn btn-secondary">API Documentation</a>
          </div>
        </section>
      </section>
    </div>
  )
}
