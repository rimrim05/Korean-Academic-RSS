const fetch = require('node-fetch');
const xml2js = require('xml2js');
const fs = require('fs');

// RSS feed URLs
const feeds = [
    {
        url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/1lGTpA7S74whuNVC_kQy0F4ncgCxeB9B9U0hbi6Wldiv2cIgV2/?limit=50&utm_campaign=pubmed-2&fc=20250822163126',
        name: 'KAIST'
    },
    {
        url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/1bo4uOs-bB_ZLOeoRMDuMyKrqOCTTJrR8i4c8aBDtpAcbJ09ch/?limit=50&utm_campaign=pubmed-2&fc=20250822163228',
        name: 'SNU'
    }
];

async function fetchFeed(feed) {
    try {
        console.log(`Fetching ${feed.name} feed...`);
        const response = await fetch(feed.url);
        const xmlData = await response.text();
        
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(xmlData);
        
        const items = result.rss.channel[0].item || [];
        
        return items.map(item => ({
            title: item.title[0],
            link: item.link[0],
            description: item.description[0],
            pubDate: new Date(item.pubDate[0]),
            source: feed.name,
            guid: item.link[0]
        }));
    } catch (error) {
        console.error(`Error fetching ${feed.name} feed:`, error);
        return [];
    }
}

function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}

async function generateRSS() {
    console.log('Starting RSS generation...');
    
    try {
        // Fetch all feeds
        const feedPromises = feeds.map(feed => fetchFeed(feed));
        const results = await Promise.all(feedPromises);
        
        // Combine and sort all items
        const allItems = results.flat().sort((a, b) => b.pubDate - a.pubDate);
        
        console.log(`Found ${allItems.length} total items`);
        
        // Generate RSS XML
        const rssContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
        <title>KAIST &amp; SNU Publications</title>
        <description>Combined academic publications from KAIST and SNU</description>
        <link>https://yourusername.github.io/your-repo-name/</link>
        <atom:link href="https://yourusername.github.io/your-repo-name/feed.xml" rel="self" type="application/rss+xml" />
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
        <language>en-us</language>
        <ttl>360</ttl>
        
        ${allItems.slice(0, 50).map(item => `
        <item>
            <title><![CDATA[${item.title} (${item.source})]]></title>
            <link>${escapeXml(item.link)}</link>
            <description><![CDATA[${item.description}]]></description>
            <pubDate>${item.pubDate.toUTCString()}</pubDate>
            <guid isPermaLink="true">${escapeXml(item.link)}</guid>
        </item>`).join('')}
    </channel>
</rss>`;

        // Write RSS file
        fs.writeFileSync('feed.xml', rssContent);
        console.log('RSS feed generated successfully!');
        
        // Also generate a JSON feed for the web interface
        const jsonFeed = {
            title: "KAIST & SNU Publications",
            description: "Combined academic publications from KAIST and SNU",
            items: allItems.slice(0, 50).map(item => ({
                title: `${item.title} (${item.source})`,
                link: item.link,
                description: item.description,
                pubDate: item.pubDate.toISOString(),
                source: item.source
            }))
        };
        
        fs.writeFileSync('feed.json', JSON.stringify(jsonFeed, null, 2));
        console.log('JSON feed generated successfully!');
        
    } catch (error) {
        console.error('Error generating RSS:', error);
        process.exit(1);
    }
}

// Run the generator
generateRSS();