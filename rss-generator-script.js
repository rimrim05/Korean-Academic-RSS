const fetch = require('node-fetch');
const xml2js = require('xml2js');
const fs = require('fs');

// Enhanced RSS feeds array with all Korean institutions
const feeds = [
    {
        url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/1lGTpA7S74whuNVC_kQy0F4ncgCxeB9B9U0hbi6Wldiv2cIgV2/?limit=50&utm_campaign=pubmed-2&fc=20250822163126',
        name: 'KAIST'
    },
    {
        url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/1bo4uOs-bB_ZLOeoRMDuMyKrqOCTTJrR8i4c8aBDtpAcbJ09ch/?limit=50&utm_campaign=pubmed-2&fc=20250822163228',
        name: 'SNU'
    },
    {
        url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/1p9j2Ia0knT7gmGP5yr8TGKmrRRyRQ0oWVA_KWuJa7rtxBZMim/?limit=100&utm_campaign=pubmed-2&fc=20250822201347',
        name: 'Yonsei University'
    },
    {
        url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/1-CFTYUQzm9gD46gso3zjzxFxkq73bOFUJwQNLwmd6SldMXg0f/?limit=100&utm_campaign=pubmed-2&fc=20250822201727',
        name: 'SKKU'
    },
    {
        url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/1ZyzHXV_xuJMd_mA0Sq1F0U-jUGJIU2JUAtLtKea9s3vCCDMAg/?limit=100&utm_campaign=pubmed-2&fc=20250822201839',
        name: 'POSTECH'
    },
    {
        url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/12guA9dSu1tGGvNP7mhhDa45fpbWpGPzILFj69wJJFdG48xkuI/?limit=100&utm_campaign=pubmed-2&fc=20250822205125',
        name: 'Korea University'
    },
    {
        url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/1HyCEy3kccvK7zE0-AQi3b_3KChicv5K_t8YL3UITyEWtrEgUY/?limit=100&utm_campaign=pubmed-2&fc=20250822210237',
        name: 'IBS'
    }
];

// ... (keep all the existing helper functions: extractPMID, extractEnhancedInfo, parseCSVLine, etc.)

function loadExistingArchive() {
    const archivePath = 'papers-archive.csv';
    try {
        if (fs.existsSync(archivePath)) {
            const csvContent = fs.readFileSync(archivePath, 'utf8');
            const lines = csvContent.split('\n');
            
            // Parse existing papers (skip header) - Updated for simplified CSV
            return lines.slice(1)
                .filter(line => line.trim())
                .map(line => {
                    const values = parseCSVLine(line);
                    return {
                        institutions: values[0] || '',
                        date: values[1] || '',
                        title: values[11] || '',
                        journal: values[12] || '',
                        link: values[13] || '',
                        pmid: extractPMID(values[13] || '')
                    };
                });
        }
    } catch (error) {
        console.log('No existing archive found:', error.message);
    }
    return [];
}

function saveEnhancedArchive(newPapers) {
    // Load existing papers
    const existingPapers = loadExistingArchive();
    
    // Create map to avoid duplicates
    const existingMap = new Set();
    existingPapers.forEach(paper => {
        const key = paper.pmid || paper.link;
        if (key) existingMap.add(key);
    });
    
    // Add only new papers
    let addedCount = 0;
    const papersToAdd = [];
    
    newPapers.forEach(paper => {
        const key = paper.pmid || paper.link;
        if (key && !existingMap.has(key)) {
            papersToAdd.push({
                institutions: paper.institutions.join(' & '),
                date: paper.pubDate.toISOString().split('T')[0],
                title: paper.title,
                journal: paper.journal || '',
                link: paper.link
            });
            addedCount++;
        }
    });
    
    // Combine all papers (new papers first, then existing)
    const allPapers = [...papersToAdd, ...existingPapers];
    
    // **SIMPLIFIED CSV HEADERS** - No Objective/Significance for Google Sheets
    const csvHeaders = 'Institutions,Date,Title,Journal,Link\n';
    const csvContent = csvHeaders + allPapers.map(paper => {
        const institutions = `"${paper.institutions}"`;
        const date = `"${paper.date}"`;
        const title = `"${paper.title.replace(/"/g, '""')}"`;
        const journal = `"${(paper.journal || '').replace(/"/g, '""')}"`;
        const link = `"${paper.link}"`;
        return `${institutions},${date},${title},${journal},${link}`;
    }).join('\n');
    
    fs.writeFileSync('papers-archive.csv', csvContent);
    console.log(`Simplified archive updated: ${addedCount} new papers added, ${allPapers.length} total archived`);
    
    return { added: addedCount, total: allPapers.length };
}

// ... (keep all other existing functions: fetchFeed, combineAndDeduplicate, etc.)

async function generateRSS() {
    console.log('Starting RSS generation with 7 Korean institutions...');
    
    try {
        // Fetch from all feeds
        const feedPromises = feeds.map(feed => fetchFeed(feed));
        const results = await Promise.all(feedPromises);
        
        // Log results per institution
        results.forEach((items, index) => {
            console.log(`${feeds[index].name}: ${items.length} items`);
        });
        
        let allItems = combineAndDeduplicate(results);
        allItems.sort((a, b) => b.pubDate - a.pubDate);
        
        console.log(`After deduplication: ${allItems.length} unique items`);
        console.log(`Multi-institutional papers: ${allItems.filter(item => item.institutions.length > 1).length}`);
        
        // Save to simplified archive (for Google Sheets)
        const archiveStats = saveEnhancedArchive(allItems);
        
        // Limit display items to 150 most recent
        const displayItems = allItems.slice(0, 150);
        
        const baseUrl = 'https://rimrim05.github.io/Korean-Academic-RSS/';
        
        // Generate RSS XML (keep existing)
        const rssContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
        <title>Korean Academic Publications</title>
        <description>Latest research from top Korean institutions (KAIST, SNU, Yonsei, SKKU, POSTECH, Korea University, IBS)</description>
        <link>${baseUrl}</link>
        <atom:link href="${baseUrl}feed.xml" rel="self" type="application/rss+xml" />
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
        <language>en-us</language>
        <ttl>360</ttl>
        
        ${displayItems.map(item => `
        <item>
            <title><![CDATA[${item.title}]]></title>
            <link>${escapeXml(item.link)}</link>
            <description><![CDATA[${item.description}]]></description>
            <pubDate>${item.pubDate.toUTCString()}</pubDate>
            <guid isPermaLink="true">${escapeXml(item.link)}</guid>
            <category>${item.institutions.join(', ')}</category>
        </item>`).join('')}
    </channel>
</rss>`;

        fs.writeFileSync('feed.xml', rssContent);

        // Enhanced statistics for all institutions
        const institutionBreakdown = {};
        feeds.forEach(feed => {
            institutionBreakdown[feed.name] = displayItems.filter(item => item.institutions.includes(feed.name)).length;
        });
        
        // Add collaboration stats
        institutionBreakdown['Multi-institutional'] = displayItems.filter(item => item.institutions.length > 1).length;

        // Generate JSON feed (KEEP objective/significance for website display)
        const jsonFeed = {
            title: "Korean Academic Publications",
            description: "Latest research from top Korean institutions with enhanced details",
            lastBuildDate: new Date().toISOString(),
            totalItems: displayItems.length,
            totalArchived: archiveStats.total,
            newPapersAdded: archiveStats.added,
            institutionBreakdown: institutionBreakdown,
            institutions: feeds.map(f => f.name),
            items: displayItems.map(item => ({
                title: item.title,
                link: item.link,
                description: item.description,
                pubDate: safeToISOString(item.pubDate),
                institutions: item.institutions,
                pmid: item.pmid,
                // Enhanced fields KEPT for website display
                journal: item.journal,
                objective: item.objective,
                significance: item.significance,
                conclusion: item.conclusion
            }))
        };
        
        fs.writeFileSync('feed.json', JSON.stringify(jsonFeed, null, 2));

        // Generate statistics (keep existing)
        const stats = {
            lastUpdate: new Date().toISOString(),
            totalItems: displayItems.length,
            totalArchived: archiveStats.total,
            newPapersAdded: archiveStats.added,
            institutionBreakdown: institutionBreakdown,
            multiInstitutional: displayItems.filter(item => item.institutions.length > 1).length,
            institutions: feeds.map(f => f.name),
            latestItem: displayItems.length > 0 ? {
                title: displayItems[0].title || 'No title',
                date: safeToISOString(displayItems.pubDate),
                institutions: displayItems.institutions || ['Unknown']
            } : null
        };
        
        fs.writeFileSync('stats.json', JSON.stringify(stats, null, 2));
        
        console.log('✅ RSS feed generated successfully!');
        console.log('✅ JSON feed generated successfully!');
        console.log('✅ Statistics generated successfully!');
        console.log(`✅ Simplified archive updated: ${archiveStats.added} new papers added, ${archiveStats.total} total archived`);
        
    } catch (error) {
        console.error('❌ Error generating RSS:', error);
        process.exit(1);
    }
}

// ... (keep all other existing helper functions)

generateRSS();
