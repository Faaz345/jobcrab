import re
from typing import List, Dict, Optional
from duckduckgo_search import DDGS

def extract_emails(text: str) -> List[str]:
    """Extract all email addresses from a given text using regex."""
    if not text:
        return []
    # Basic email regex
    pattern = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
    return re.findall(pattern, text)

def scrape_hr_contacts(company_name: str, domain: Optional[str] = None) -> List[Dict[str, str]]:
    """
    Search DuckDuckGo for HR/Recruiter emails associated with the given company.
    """
    contacts = []
    seen_emails = set()
    
    # Try multiple dork queries to maximize results
    queries = [
        f'"{company_name}" ("HR" OR "Recruiter" OR "Talent Acquisition") email',
    ]
    
    if domain:
        queries.append(f'"@{domain}" "HR" OR "Recruiter" OR "Talent"')
        
    try:
        with DDGS() as ddgs:
            for query in queries:
                # Get top 20 results per query
                results = ddgs.text(query, max_results=20)
                if not results:
                    continue
                    
                for result in results:
                    snippet = result.get('body', '')
                    title = result.get('title', '')
                    
                    # Combine title and snippet to search for emails
                    text_to_search = f"{title} {snippet}"
                    emails = extract_emails(text_to_search)
                    
                    for email in emails:
                        email = email.lower()
                        # Basic filtering
                        if email in seen_emails:
                            continue
                        
                        # Filter out common false positives
                        if email.startswith('info@') or email.startswith('contact@') or email.startswith('sales@'):
                            # We want HR specific if possible, but keep them if we have nothing else?
                            # Let's keep them but maybe deprioritize later.
                            pass
                            
                        # If a domain is provided, we prefer emails matching the domain
                        if domain and domain.lower() not in email:
                            # It could be a gmail recruiter, we'll keep it but it might be lower quality
                            pass
                            
                        contacts.append({
                            "email": email,
                            "name": "HR Team", # We usually can't reliably extract the exact name from snippets without NLP
                            "source": result.get('href', 'Search Engine'),
                            "confidence": "high" if domain and domain.lower() in email else "medium"
                        })
                        seen_emails.add(email)
                        
    except Exception as e:
        print(f"Error scraping HR contacts for {company_name}: {e}")
        
    # If we found nothing, return a fallback generic guess if domain is known
    if not contacts and domain:
        contacts.append({
            "email": f"careers@{domain}",
            "name": "Careers Team",
            "source": "Guessed fallback",
            "confidence": "low"
        })
        
    # Sort by confidence
    def score_confidence(c):
        return {"high": 3, "medium": 2, "low": 1}.get(c['confidence'], 0)
        
    return sorted(contacts, key=score_confidence, reverse=True)
