import httpx


def web_search(query: str) -> str:
    """Search the web using DuckDuckGo Instant Answers. Returns results as text.

    This uses the Instant Answer API, which works best for English factual queries.
    For Spanish product pages or specific companies, prefer scrape_product or web_fetch
    with a direct URL instead.

    IMPORTANT: If this returns "No results found" twice in a row, stop searching
    and use scrape_product or web_fetch with a known URL instead.

    Args:
        query: Search query string. Use English and simple terms for best results.
    """
    try:
        response = httpx.get(
            "https://api.duckduckgo.com/",
            params={"q": query, "format": "json", "no_html": 1},
            timeout=15.0,
        )
        if response.status_code == 202:
            return "No results found (search returned 202). Try scrape_product or web_fetch with a direct URL."
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
    return "\n\n".join(results) if results else "No results found. Try scrape_product or web_fetch with a direct URL."


def web_fetch(url: str) -> str:
    """Fetch the text content of a URL. Returns the first 10,000 characters.

    Use this when you know the exact URL to fetch. For lineadirecta.com products,
    prefer scrape_product which constructs the URL automatically.

    Args:
        url: The full URL to fetch (must start with http:// or https://).
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
    """Scrape product information from lineadirecta.com. This is the PRIMARY tool
    for researching Línea Directa products — use it BEFORE web_search.

    Common slugs: seguro-coche, seguro-moto, seguro-hogar, seguro-vida,
    seguro-salud, seguro-movilidad, seguro-patinete.

    Args:
        product_slug: Product URL slug (e.g. 'seguro-coche', 'seguro-hogar').
    """
    url = f"https://www.lineadirecta.com/{product_slug}"
    return web_fetch(url)
