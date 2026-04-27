import httpx


def web_search(query: str) -> str:
    """Search the web for information. Returns search results as text.

    Args:
        query: Search query string.
    """
    try:
        response = httpx.get(
            "https://api.duckduckgo.com/",
            params={"q": query, "format": "json", "no_html": 1},
            timeout=15.0,
        )
        response.raise_for_status()
        data = response.json()
    except (httpx.HTTPStatusError, httpx.RequestError) as e:
        return f"Search error: {e}"
    except ValueError:
        return "Search returned invalid response."
    results = []
    if data.get("AbstractText"):
        results.append(data["AbstractText"])
    for topic in data.get("RelatedTopics", [])[:5]:
        if isinstance(topic, dict) and topic.get("Text"):
            results.append(topic["Text"])
    return "\n\n".join(results) if results else "No results found."


def web_fetch(url: str) -> str:
    """Fetch the text content of a URL.

    Args:
        url: The URL to fetch.
    """
    try:
        response = httpx.get(url, timeout=15.0, follow_redirects=True)
        response.raise_for_status()
        return response.text[:10000]
    except httpx.HTTPStatusError as e:
        return f"Error fetching {url}: HTTP {e.response.status_code}"
    except httpx.RequestError as e:
        return f"Error fetching {url}: {e}"


def scrape_product(product_slug: str) -> str:
    """Scrape product information from lineadirecta.com.

    Args:
        product_slug: Product URL slug (e.g. 'seguro-coche', 'seguro-hogar').
    """
    url = f"https://www.lineadirecta.com/{product_slug}"
    return web_fetch(url)
