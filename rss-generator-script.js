const fetch = require('node-fetch');
const xml2js = require('xml2js');
const fs = require('fs');

// Try to load TensorFlow.js, fallback to rule-based classification
let tf = null;
let mlModel = null;

try {
    tf = require('@tensorflow/tfjs-node');
} catch (error) {
    console.log('⚠️ TensorFlow.js not available, using rule-based classification');
}

// Enhanced RSS feeds array with all Korean institutions
const feeds = [
    {
        url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/1lGTpA7S74whuNVC_kQy0F4ncgCxeB9B9U0hbi6Wldiv2cIgV2/?limit=50&utm_campaign=pubmed-2&fc=20250822163126',
        name: 'KAIST'
    },
    {
        url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/1bo4uOs-bB_ZLOeoRMDuMyKrqOCTTJrR8i4c8aBDtpAcbJ09ch/?limit=100&utm_campaign=pubmed-2&fc=20250822163228',
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
    },
    {
        url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/1J__86CjOXspvrvYwWhLha0HUgjE7uW1knCYZ8uwr5FW9x1oDL/?limit=100&utm_campaign=pubmed-2&fc=20250824200837',
        name: 'UNIST'
    },
    {
        url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/16ywSWzIPvPjkjZL5IOJ6EoFrfLJCBZcYAq0zId87nG-u18olu/?limit=100&utm_campaign=pubmed-2&fc=20250824200857',
        name: 'Hanyang University'
    },
    {
        url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/1-u-VnOuHrrKiO4WMPvz_i-F2FoAlfu-lcoSZ3mSAjuT4X8gzB/?limit=100&utm_campaign=pubmed-2&fc=20250824200958',
        name: 'KIST'
    },
    {
        url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/12Ak-Eek5aCiXtpXt5nPotfAmzuqq2n4KV7PFY26W42gL0Wk4G/?limit=100&utm_campaign=pubmed-2&fc=20250824201017',
        name: 'GIST'
    },
    {
        url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/14wpWf7MA3AKQSRGSBGZnJWuy_XngRdzPRoKvgHBVI3A4IsM3D/?limit=100&utm_campaign=pubmed-2&fc=20250824201035',
        name: 'Kyung Hee University'
    },
    {
        url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/1lIZdG7__acDiOnILwc1UJFv1EU2tzCDqwphAfr3PZolpno9sb/?limit=100&utm_campaign=pubmed-2&fc=20250824201059',
        name: 'Pusan National University'
    }
];

// Load trained model
async function loadMLModel() {
    if (!tf) return false;
    
    try {
        const modelPath = 'file://./ml-model';
        if (fs.existsSync('./ml-model')) {
            mlModel = await tf.loadLayersModel(modelPath);
            console.log('✅ ML model loaded successfully');
            return true;
        } else {
            console.log('⚠️ ML model not found. Run: npm run train');
            return false;
        }
    } catch (error) {
        console.error('❌ Error loading ML model:', error.message);
        return false;
    }
}

// Simple feature extraction for classification
function extractFeatures(title, abstract) {
    const text = `${title} ${abstract}`.toLowerCase();
    const allWords = ['machine', 'learning', 'artificial', 'intelligence', 'neural', 'network', 
                      'clinical', 'medical', 'patient', 'treatment', 'biological', 'cell', 'gene',
                      'material', 'synthesis', 'device', 'battery', 'energy', 'cancer', 'tumor',
                      'brain', 'neuron', 'cognitive', 'algorithm', 'data', 'computer', 'software'];
    
    return allWords.map(word => (text.includes(word) ? 1 : 0));
}

// ML Classification function
function classifyWithML(title, abstract) {
    if (!mlModel || !tf) {
        return classifyWithRules(title, abstract);
    }
    
    try {
        const features = extractFeatures(title, abstract);
        const prediction = mlModel.predict(tf.tensor2d([features]));
        const probabilities = prediction.arraySync()[0];
        
        const categories = ['Computer Science', 'Biomedical', 'Materials Science', 'Cancer Research', 'Neuroscience'];
        const maxIndex = probabilities.indexOf(Math.max(...probabilities));
        
        prediction.dispose();
        
        return {
            category: categories[maxIndex],
            confidence: probabilities[maxIndex]
        };
    } catch (error) {
        console.error('ML classification error:', error.message);
        return classifyWithRules(title, abstract);
    }
}

// Rule-based fallback classification
function classifyWithRules(title, abstract) {
    const text = `${title} ${abstract}`.toLowerCase();
    
    if (text.includes('cancer') || text.includes('tumor') || text.includes('oncology')) {
        return { category: 'Cancer Research', confidence: 0.8 };
    }
    
    if (text.includes('machine learning') || text.includes('artificial intelligence') || text.includes('neural network')) {
        return { category: 'Computer Science', confidence: 0.8 };
    }
    
    if (text.includes('material') || text.includes('battery') || text.includes('solar') || text.includes('energy')) {
        return { category: 'Materials Science', confidence: 0.8 };
    }
    
    if (text.includes('brain') || text.includes('neuron') || text.includes('cognitive')) {
        return { category: 'Neuroscience', confidence: 0.8 };
    }
    
    if (text.includes('clinical') || text.includes('medical') || text.includes('patient')) {
        return { category: 'Biomedical', confidence: 0.8 };
    }
    
    return { category: 'Multidisciplinary', confidence: 0.5 };
}

function extractPMID(url) {
    const match = url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/);
    return match ? match[1] : null;
}

function extractEnhancedInfo(title, description) {
    if (!description) {
        return {
            journal: null,
            objective: null,
            significance: null,
            conclusion: null
        };
    }

    const desc = description.toLowerCase();
    
    // Extract journal name (common patterns)
    let journal = null;
    const journalPatterns = [
        /published in ([^.]+)/i,
        /from ([a-z\s&]+journal[^.]*)/i,
        /in ([^,]+), \d{4}/i,
        /(nature|science|cell|lancet|jama|nejm|pnas|plos|frontiers|journal of|international journal|european journal|american journal)[^.]+/i
    ];
    
    for (const pattern of journalPatterns) {
        const match = description.match(pattern);
        if (match) {
            journal = match[1] || match[0];
            journal = journal.replace(/^(in|from|published in)\s+/i, '').trim();
            break;
        }
    }
    
    // Extract objective/aim
    let objective = null;
    const objectivePatterns = [
        /(?:objective|aim|purpose|goal)s?[:\s]+([^.]+)/i,
        /this study (?:aimed to|sought to|investigated|examined|analyzed)\s+([^.]+)/i,
        /we (?:aimed to|sought to|investigated|examined|analyzed)\s+([^.]+)/i,
        /the (?:purpose|goal|aim|objective) (?:of this study )?(?:was|is) to\s+([^.]+)/i
    ];
    
    for (const pattern of objectivePatterns) {
        const match = description.match(pattern);
        if (match && match[1]) {
            objective = match[1].trim();
            if (objective.length > 200) {
                objective = objective.substring(0, 200) + '...';
            }
            break;
        }
    }
    
    // Extract significance
    let significance = null;
    const significancePatterns = [
        /(?:significance|important|implications?|impact)[:\s]+([^.]+)/i,
        /this (?:finding|result|study) (?:suggests?|indicates?|shows?|demonstrates?)\s+([^.]+)/i,
        /these (?:findings?|results?) (?:suggest|indicate|show|demonstrate)\s+([^.]+)/i,
        /clinical significance[:\s]+([^.]+)/i,
        /implications? for\s+([^.]+)/i
    ];
    
    for (const pattern of significancePatterns) {
        const match = description.match(pattern);
        if (match && match[1]) {
            significance = match[1].trim();
            if (significance.length > 200) {
                significance = significance.substring(0, 200) + '...';
            }
            break;
        }
    }
    
    // Extract conclusion
    let conclusion = null;
    const conclusionPatterns = [
        /conclusions?[:\s]+([^.]+(?:\.[^.]+)?)/i,
        /in conclusion[,\s]+([^.]+)/i,
        /we conclude (?:that\s+)?([^.]+)/i,
        /our (?:findings?|results?|study) (?:suggest|indicate|show|demonstrate)\s+([^.]+)/i
    ];
    
    for (const pattern of conclusionPatterns) {
        const match = description.match(pattern);
        if (match && match[1]) {
            conclusion = match[1].trim();
            if (conclusion.length > 300) {
                conclusion = conclusion.substring(0, 300) + '...';
            }
            break;
        }
    }
    
    return {
        journal: journal ? journal.substring(0, 100) : null,
        objective,
        significance,
        conclusion
    };
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++; // Skip next quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

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
                        title: values[2] || '',
                        subjectArea: values[3] || '',
                        journal: values[4] || '',
                        link: values[5] || '',
                        pmid: extractPMID(values[5] || '')
                    };
                });
        }
    } catch (error) {
        console.log('No existing archive found:', error.message);
    }
    return [];
}

function saveEnhancedArchive(newPapers) {
    const existingPapers = loadExistingArchive();
    console.log(`📚 Loaded ${existingPapers.length} existing papers from archive`);
    
    // Create comprehensive deduplication map
    const allPapersMap = new Map();
    
    // Add existing papers to map (excluding blanks)
    existingPapers.forEach(paper => {
        if (paper.title && paper.title.trim() !== '' && 
            paper.link && paper.link.trim() !== '') {
            
            const key = paper.pmid || paper.link || `${paper.institutions}-${paper.title}`;
            if (!allPapersMap.has(key)) {
                allPapersMap.set(key, paper);
            }
        } else {
            console.log(`🧹 Skipping blank existing entry: ${paper.institutions}, ${paper.date}`);
        }
    });
    
    // Add new papers to map
    let addedCount = 0;
    newPapers.forEach(paper => {
        if (paper.title && paper.title.trim() !== '' && 
            paper.link && paper.link.trim() !== '') {
            
            const key = paper.pmid || paper.link;
            if (!allPapersMap.has(key)) {
                const newEntry = {
                    institutions: paper.institutions.join(' & '),
                    date: paper.pubDate.toISOString().split('T')[0],
                    title: paper.title.trim(),
                    subjectArea: paper.subjectArea || 'Multidisciplinary',
                    journal: (paper.journal || '').trim(),
                    link: paper.link.trim(),
                    pmid: paper.pmid
                };
                allPapersMap.set(key, newEntry);
                addedCount++;
            }
        }
    });
    
    // Convert map to array and sort by date (newest first)
    const allValidPapers = Array.from(allPapersMap.values())
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Write clean CSV
    const csvHeaders = 'Institutions,Date,Title,Subject Area,Journal,Link\n';
    const csvContent = csvHeaders + allValidPapers.map(paper => {
        const institutions = `"${(paper.institutions || '').replace(/"/g, '""')}"`;
        const date = `"${paper.date || ''}"`;
        const title = `"${(paper.title || '').replace(/"/g, '""')}"`;
        const subjectArea = `"${(paper.subjectArea || 'Multidisciplinary').replace(/"/g, '""')}"`;
        const journal = `"${(paper.journal || '').replace(/"/g, '""')}"`;
        const link = `"${(paper.link || '').replace(/"/g, '""')}"`;
        return `${institutions},${date},${title},${subjectArea},${journal},${link}`;
    }).join('\n');
    
    fs.writeFileSync('papers-archive.csv', csvContent);
    
    const removedBlanks = existingPapers.length - (allValidPapers.length - addedCount);
    console.log(`✅ Archive updated: ${addedCount} new papers, ${removedBlanks} blanks removed, ${allValidPapers.length} total valid papers`);
    
    return { added: addedCount, total: allValidPapers.length };
}

// FIXED: Made async and added proper headers + error handling
async function fetchFeed(feed) {
    try {
        console.log(`Fetching ${feed.name} feed...`);
        
        // Add proper headers to avoid blocking
        const response = await fetch(feed.url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Compatible RSS Reader for Korean Academic Research)',
                'Accept': 'application/rss+xml, application/xml, text/xml',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!response.ok) {
            console.error(`❌ ${feed.name} feed failed: ${response.status}`);
            return []; // Return empty array instead of undefined
        }
        
        const xmlData = await response.text();
        
        // Validate RSS content
        if (!xmlData || !xmlData.includes('<rss') && !xmlData.includes('<feed')) {
            console.error(`❌ ${feed.name} returned invalid RSS data`);
            return [];
        }
        
        const parser = new xml2js.Parser({
            explicitArray: false,
            mergeAttrs: true,
            normalize: true,
            normalizeTags: true,
            trim: true
        });
        
        const result = await parser.parseStringPromise(xmlData);
        
        if (!result.rss || !result.rss.channel || !result.rss.channel.item) {
            console.log(`⚠️ ${feed.name} feed is empty or invalid`);
            return [];
        }
        
        const items = Array.isArray(result.rss.channel.item) 
            ? result.rss.channel.item 
            : [result.rss.channel.item];
        
        return items.map(item => {
            // 🔥 STRICT VALIDATION: Skip items with missing essential data
            if (!item.title || !item.link || 
                item.title.trim() === '' || 
                item.link.trim() === '' ||
                item.title === 'No title') {
                console.log(`⚠️ Skipping invalid item from ${feed.name}: missing/invalid title or link`);
                return null; // Will be filtered out
            }
            
            // Rest of your existing processing...
            let pubDate;
            try {
                const dateStr = item.pubdate || item.pubDate || item.pubdate;
                pubDate = dateStr ? new Date(dateStr) : new Date();
                if (isNaN(pubDate.getTime())) {
                    pubDate = new Date();
                }
            } catch (e) {
                pubDate = new Date();
            }

            const enhancedInfo = extractEnhancedInfo(item.title, item.description);
            const classification = classifyWithML(item.title || '', item.description || '');
            
            console.log(`📝 ${item.title.substring(0, 50)}... → ${classification.category} (${(classification.confidence * 100).toFixed(1)}%)`);
            
            return {
                title: item.title.trim(),
                link: item.link.trim(),
                description: (item.description || '').trim(),
                pubDate: pubDate,
                source: feed.name,
                pmid: extractPMID(item.link),
                guid: item.link || item.guid || '',
                subjectArea: classification.category,
                confidence: classification.confidence,
                journal: enhancedInfo.journal,
                objective: enhancedInfo.objective,
                significance: enhancedInfo.significance,
                conclusion: enhancedInfo.conclusion
            };
        }).filter(item => item !== null); // Remove null items
        
    } catch (error) {
        console.error(`❌ Error fetching ${feed.name} feed:`, error.message);
        return []; // Return empty array instead of undefined
    }
}

function combineAndDeduplicate(allFeeds) {
    const paperMap = new Map();
    
    allFeeds.forEach(feedItems => {
        feedItems.forEach(item => {
            // 🔥 STRICT VALIDATION: Skip items without essential data
            if (!item.title || !item.link || 
                item.title.trim() === '' || 
                item.link.trim() === '' ||
                item.title === 'No title') {
                console.log(`⚠️ Skipping invalid item: title="${item.title}", link="${item.link}"`);
                return; // Skip this item entirely
            }
            
            const key = item.pmid || item.link;
            
            if (paperMap.has(key)) {
                const existingPaper = paperMap.get(key);
                if (!existingPaper.institutions.includes(item.source)) {
                    existingPaper.institutions.push(item.source);
                    existingPaper.institutions.sort();
                }
            } else {
                const newPaper = {
                    ...item,
                    institutions: [item.source]
                };
                paperMap.set(key, newPaper);
            }
        });
    });
    
    console.log(`✅ Combined and deduplicated: ${paperMap.size} unique papers`);
    return Array.from(paperMap.values());
}

function escapeXml(unsafe) {
    if (!unsafe) return '';
    return unsafe.toString().replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}

function safeToISOString(date) {
    try {
        if (!date) return new Date().toISOString();
        return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
    } catch (e) {
        return new Date().toISOString();
    }
}

async function generateRSS() {
    console.log('🚀 Starting RSS generation with ML classification...');
    
    // Load ML model
    const mlLoaded = await loadMLModel();
    console.log(`🧠 ML Classification: ${mlLoaded ? 'ENABLED' : 'DISABLED (using rules)'}`);
    
    try {
        // FIXED: Sequential fetching with delays instead of parallel
        const results = [];
        for (let i = 0; i < feeds.length; i++) {
            const feedResult = await fetchFeed(feeds[i]);
            results.push(feedResult);
            
            // Add 2-second delay between requests to respect rate limits
            if (i < feeds.length - 1) {
                console.log(`⏱️ Waiting 2 seconds before next feed...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        // Log results per institution
        results.forEach((items, index) => {
            console.log(`${feeds[index].name}: ${items.length} items`);
        });
        
        let allItems = combineAndDeduplicate(results);
        allItems.sort((a, b) => b.pubDate - a.pubDate);
        
        console.log(`After deduplication: ${allItems.length} unique items`);
        
        // Generate subject area statistics
        const subjectAreaStats = {};
        allItems.forEach(item => {
            subjectAreaStats[item.subjectArea] = (subjectAreaStats[item.subjectArea] || 0) + 1;
        });
        
        console.log('📊 Subject area distribution:');
        Object.entries(subjectAreaStats).forEach(([area, count]) => {
            console.log(`  ${area}: ${count} papers`);
        });
        
        // Save to archive with ML categories
        const archiveStats = saveEnhancedArchive(allItems);
        
        // Limit display items to 150 most recent
        const displayItems = allItems.slice(0, 150);
        
        const baseUrl = 'https://rimrim05.github.io/Korean-Academic-RSS/';
        
        // Generate RSS XML
        const rssContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
        <title>Korean Academic Publications with ML Classification</title>
        <description>Latest research from top Korean institutions with AI-powered subject classification</description>
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
        
        const subjectAreaBreakdown = {};
        displayItems.forEach(item => {
            subjectAreaBreakdown[item.subjectArea] = (subjectAreaBreakdown[item.subjectArea] || 0) + 1;
        });

        // Generate JSON feed with ML classifications
        const jsonFeed = {
            title: "Korean Academic Publications with ML Classification",
            description: "Latest research from top Korean institutions with AI-powered subject classification",
            lastBuildDate: new Date().toISOString(),
            totalItems: displayItems.length,
            totalArchived: archiveStats.total,
            newPapersAdded: archiveStats.added,
            institutionBreakdown: institutionBreakdown,
            subjectAreaBreakdown: subjectAreaBreakdown,
            mlClassificationEnabled: mlLoaded,
            institutions: feeds.map(f => f.name),
            items: displayItems.map(item => ({
                title: item.title,
                link: item.link,
                description: item.description,
                pubDate: safeToISOString(item.pubDate),
                institutions: item.institutions,
                pmid: item.pmid,
                // ML-enhanced fields
                subjectArea: item.subjectArea,
                confidence: item.confidence,
                journal: item.journal,
                objective: item.objective,
                significance: item.significance,
                conclusion: item.conclusion
            }))
        };
        
        fs.writeFileSync('feed.json', JSON.stringify(jsonFeed, null, 2));

        // Generate statistics
        const stats = {
            lastUpdate: new Date().toISOString(),
            totalItems: displayItems.length,
            totalArchived: archiveStats.total,
            newPapersAdded: archiveStats.added,
            institutionBreakdown: institutionBreakdown,
            subjectAreaBreakdown: subjectAreaBreakdown,
            multiInstitutional: displayItems.filter(item => item.institutions.length > 1).length,
            institutions: feeds.map(f => f.name),
            mlClassificationEnabled: mlLoaded,
            latestItem: displayItems.length > 0 ? {
                title: displayItems[0].title || 'No title',
                date: safeToISOString(displayItems[0].pubDate),
                institutions: displayItems[0].institutions || ['Unknown']
            } : null
        };
        
        fs.writeFileSync('stats.json', JSON.stringify(stats, null, 2));
        
        console.log('✅ Enhanced RSS feed with ML classification generated successfully!');
        console.log(`🧠 ML Classification: ${mlLoaded ? 'ENABLED' : 'DISABLED (using rules)'}`);
        console.log(`📊 Subject areas found: ${Object.keys(subjectAreaBreakdown).length}`);
        
    } catch (error) {
        console.error('❌ Error generating RSS:', error);
        process.exit(1);
    }
}

generateRSS();
