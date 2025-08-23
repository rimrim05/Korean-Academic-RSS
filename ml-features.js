// ml-features.js - Feature extraction for ML classification
const natural = require('natural');

class FeatureExtractor {
    constructor() {
        // Initialize stemmer and tokenizer
        this.stemmer = natural.PorterStemmer;
        this.tokenizer = new natural.WordTokenizer();
        
        // Academic keyword patterns
        this.keywords = {
            // Computer Science
            ai: ['artificial intelligence', 'machine learning', 'deep learning', 'neural network', 'algorithm', 'computer vision', 'nlp', 'data mining'],
            computer: ['computer', 'software', 'system', 'programming', 'database', 'network', 'cybersecurity', 'robotics'],
            
            // Biomedical
            medical: ['clinical', 'medical', 'patient', 'treatment', 'therapy', 'diagnosis', 'health', 'disease', 'hospital'],
            biological: ['biological', 'cell', 'gene', 'protein', 'molecular', 'dna', 'rna', 'biology', 'biochemistry'],
            
            // Cancer
            cancer: ['cancer', 'tumor', 'oncology', 'chemotherapy', 'radiation', 'metastasis', 'malignant', 'carcinoma', 'neoplasm'],
            
            // Materials Science
            materials: ['material', 'synthesis', 'nanoparticle', 'device', 'fabrication', 'nanotechnology', 'composite'],
            energy: ['battery', 'solar', 'energy', 'fuel cell', 'photovoltaic', 'renewable', 'storage'],
            
            // Neuroscience
            neuro: ['brain', 'neuron', 'cognitive', 'memory', 'alzheimer', 'parkinson', 'neurological', 'behavior'],
            
            // Engineering
            engineering: ['engineering', 'technology', 'manufacturing', 'design', 'optimization', 'control', 'automation'],
            
            // Environmental
            environmental: ['environmental', 'climate', 'pollution', 'ecology', 'sustainability', 'carbon', 'water'],
            
            // Physics
            physics: ['physics', 'quantum', 'optics', 'photon', 'laser', 'spectroscopy', 'theoretical', 'experimental'],
            
            // Methodology indicators
            methodology: ['method', 'approach', 'technique', 'procedure', 'protocol', 'analysis', 'study'],
            results: ['results', 'findings', 'outcome', 'conclusion', 'demonstrated', 'showed', 'revealed']
        };
    }

    extractFeatures(title, abstract) {
        const text = `${title} ${abstract}`.toLowerCase();
        const tokens = this.tokenizer.tokenize(text);
        const stemmedTokens = tokens.map(token => this.stemmer.stem(token));
        const textJoined = stemmedTokens.join(' ');

        // Extract binary features based on keyword presence
        const features = {
            // Computer Science features
            hasAI: this.hasKeywords(textJoined, this.keywords.ai) ? 1 : 0,
            hasComputer: this.hasKeywords(textJoined, this.keywords.computer) ? 1 : 0,
            hasMachineLearning: text.includes('machine learning') || text.includes('deep learning') ? 1 : 0,
            hasAlgorithm: text.includes('algorithm') || text.includes('neural network') ? 1 : 0,
            hasDeepLearning: text.includes('deep learning') || text.includes('cnn') || text.includes('rnn') ? 1 : 0,
            hasNeuralNetwork: text.includes('neural network') || text.includes('neural net') ? 1 : 0,
            hasSoftware: text.includes('software') || text.includes('system') ? 1 : 0,
            hasSystem: text.includes('system') || text.includes('platform') ? 1 : 0,

            // Biomedical features
            hasClinical: this.hasKeywords(textJoined, this.keywords.medical) ? 1 : 0,
            hasMedical: text.includes('medical') || text.includes('clinical') ? 1 : 0,
            hasPatient: text.includes('patient') || text.includes('treatment') ? 1 : 0,
            hasTreatment: text.includes('treatment') || text.includes('therapy') ? 1 : 0,
            hasTherapy: text.includes('therapy') || text.includes('therapeutic') ? 1 : 0,
            hasDiagnosis: text.includes('diagnosis') || text.includes('diagnostic') ? 1 : 0,
            hasHealth: text.includes('health') || text.includes('healthcare') ? 1 : 0,
            hasDisease: text.includes('disease') || text.includes('disorder') ? 1 : 0,
            hasBiological: this.hasKeywords(textJoined, this.keywords.biological) ? 1 : 0,
            hasCell: text.includes('cell') || text.includes('cellular') ? 1 : 0,
            hasGene: text.includes('gene') || text.includes('genetic') ? 1 : 0,
            hasProtein: text.includes('protein') || text.includes('enzyme') ? 1 : 0,
            hasMolecular: text.includes('molecular') || text.includes('molecule') ? 1 : 0,
            hasDNA: text.includes('dna') || text.includes('genome') ? 1 : 0,
            hasRNA: text.includes('rna') || text.includes('transcription') ? 1 : 0,
            hasBiology: text.includes('biology') || text.includes('biological') ? 1 : 0,

            // Cancer research features
            hasCancer: this.hasKeywords(textJoined, this.keywords.cancer) ? 1 : 0,
            hasTumor: text.includes('tumor') || text.includes('tumour') ? 1 : 0,
            hasOncology: text.includes('oncology') || text.includes('oncological') ? 1 : 0,
            hasChemotherapy: text.includes('chemotherapy') || text.includes('chemo') ? 1 : 0,
            hasRadiation: text.includes('radiation') || text.includes('radiotherapy') ? 1 : 0,
            hasMetastasis: text.includes('metastasis') || text.includes('metastatic') ? 1 : 0,
            hasMalignant: text.includes('malignant') || text.includes('benign') ? 1 : 0,
            hasCarcinoma: text.includes('carcinoma') || text.includes('sarcoma') ? 1 : 0,

            // Materials Science features
            hasMaterial: this.hasKeywords(textJoined, this.keywords.materials) ? 1 : 0,
            hasSynthesis: text.includes('synthesis') || text.includes('synthesized') ? 1 : 0,
            hasNanoparticle: text.includes('nanoparticle') || text.includes('nanomaterial') ? 1 : 0,
            hasDevice: text.includes('device') || text.includes('sensor') ? 1 : 0,
            hasBattery: this.hasKeywords(textJoined, this.keywords.energy) ? 1 : 0,
            hasSolar: text.includes('solar') || text.includes('photovoltaic') ? 1 : 0,
            hasEnergy: text.includes('energy') || text.includes('power') ? 1 : 0,
            hasFabrication: text.includes('fabrication') || text.includes('manufacturing') ? 1 : 0,
            hasPolymers: text.includes('polymer') || text.includes('composite') ? 1 : 0,
            hasComposite: text.includes('composite') || text.includes('matrix') ? 1 : 0,
            hasNanomaterials: text.includes('nanomaterial') || text.includes('nanostructure') ? 1 : 0,
            hasSemiconductor: text.includes('semiconductor') || text.includes('silicon') ? 1 : 0,
            hasElectronic: text.includes('electronic') || text.includes('electrical') ? 1 : 0,
            hasOptical: text.includes('optical') || text.includes('optoelectronic') ? 1 : 0,
            hasMechanical: text.includes('mechanical') || text.includes('strength') ? 1 : 0,
            hasCharacterization: text.includes('characterization') || text.includes('analysis') ? 1 : 0,

            // Neuroscience features
            hasBrain: this.hasKeywords(textJoined, this.keywords.neuro) ? 1 : 0,
            hasNeuron: text.includes('neuron') || text.includes('neuronal') ? 1 : 0,
            hasCognitive: text.includes('cognitive') || text.includes('cognition') ? 1 : 0,
            hasMemory: text.includes('memory') || text.includes('learning') ? 1 : 0,
            hasAlzheimer: text.includes('alzheimer') || text.includes('dementia') ? 1 : 0,
            hasParkinson: text.includes('parkinson') || text.includes('parkinsonian') ? 1 : 0,
            hasNeurological: text.includes('neurological') || text.includes('neurology') ? 1 : 0,
            hasBehavior: text.includes('behavior') || text.includes('behaviour') ? 1 : 0,

            // Engineering features
            hasEngineering: this.hasKeywords(textJoined, this.keywords.engineering) ? 1 : 0,
            hasTechnology: text.includes('technology') || text.includes('technological') ? 1 : 0,
            hasManufacturing: text.includes('manufacturing') || text.includes('production') ? 1 : 0,
            hasDesign: text.includes('design') || text.includes('designed') ? 1 : 0,
            hasOptimization: text.includes('optimization') || text.includes('optimize') ? 1 : 0,
            hasControl: text.includes('control') || text.includes('controller') ? 1 : 0,
            hasAutomation: text.includes('automation') || text.includes('automated') ? 1 : 0,
            hasRobotics: text.includes('robotics') || text.includes('robot') ? 1 : 0,

            // Environmental features
            hasEnvironmental: this.hasKeywords(textJoined, this.keywords.environmental) ? 1 : 0,
            hasClimate: text.includes('climate') || text.includes('climatic') ? 1 : 0,
            hasPollution: text.includes('pollution') || text.includes('contamination') ? 1 : 0,
            hasEcology: text.includes('ecology') || text.includes('ecological') ? 1 : 0,
            hasSustainability: text.includes('sustainability') || text.includes('sustainable') ? 1 : 0,
            hasRenewable: text.includes('renewable') || text.includes('green') ? 1 : 0,
            hasCarbon: text.includes('carbon') || text.includes('co2') ? 1 : 0,
            hasWater: text.includes('water') || text.includes('aquatic') ? 1 : 0,

            // Physics features
            hasPhysics: this.hasKeywords(textJoined, this.keywords.physics) ? 1 : 0,
            hasQuantum: text.includes('quantum') || text.includes('qubit') ? 1 : 0,
            hasOptics: text.includes('optics') || text.includes('optical') ? 1 : 0,
            hasPhoton: text.includes('photon') || text.includes('photonic') ? 1 : 0,
            hasLaser: text.includes('laser') || text.includes('beam') ? 1 : 0,
            hasSpectroscopy: text.includes('spectroscopy') || text.includes('spectral') ? 1 : 0,
            hasTheoretical: text.includes('theoretical') || text.includes('theory') ? 1 : 0,
            hasExperimental: text.includes('experimental') || text.includes('experiment') ? 1 : 0,

            // Document structure features
            titleLength: Math.min(title.length / 100, 1), // Normalized title length
            abstractLength: Math.min(abstract.length / 2000, 1), // Normalized abstract length
            hasMethodology: this.hasKeywords(textJoined, this.keywords.methodology) ? 1 : 0,
            hasResults: this.hasKeywords(textJoined, this.keywords.results) ? 1 : 0,
            hasModel: text.includes('model') || text.includes('modeling') ? 1 : 0,
            hasAnalysis: text.includes('analysis') || text.includes('analyzed') ? 1 : 0,
            hasData: text.includes('data') || text.includes('dataset') ? 1 : 0
        };

        return features;
    }

    hasKeywords(text, keywords) {
        return keywords.some(keyword => text.includes(keyword.toLowerCase()));
    }

    // Classify text using extracted features
    classifyFeatures(features) {
        // Simple rule-based fallback classification
        const scores = {
            computerScience: 0,
            biomedical: 0,
            cancerResearch: 0,
            materialsScience: 0,
            neuroscience: 0,
            engineering: 0,
            environmental: 0,
            physics: 0,
            multidisciplinary: 0
        };

        // Computer Science scoring
        scores.computerScience += (features.hasAI + features.hasMachineLearning + features.hasAlgorithm + 
                                  features.hasDeepLearning + features.hasNeuralNetwork + features.hasComputer + 
                                  features.hasSoftware + features.hasSystem) * 2;

        // Biomedical scoring
        scores.biomedical += (features.hasClinical + features.hasMedical + features.hasPatient + 
                             features.hasTreatment + features.hasTherapy + features.hasDiagnosis + 
                             features.hasHealth + features.hasDisease + features.hasBiological + 
                             features.hasCell + features.hasGene + features.hasProtein) * 2;

        // Cancer Research scoring
        scores.cancerResearch += (features.hasCancer + features.hasTumor + features.hasOncology + 
                                 features.hasChemotherapy + features.hasRadiation + features.hasMetastasis) * 3;

        // Materials Science scoring
        scores.materialsScience += (features.hasMaterial + features.hasSynthesis + features.hasNanoparticle + 
                                   features.hasDevice + features.hasBattery + features.hasSolar + 
                                   features.hasEnergy + features.hasFabrication) * 2;

        // Neuroscience scoring
        scores.neuroscience += (features.hasBrain + features.hasNeuron + features.hasCognitive + 
                               features.hasMemory + features.hasAlzheimer + features.hasParkinson) * 3;

        // Engineering scoring
        scores.engineering += (features.hasEngineering + features.hasTechnology + features.hasManufacturing + 
                              features.hasDesign + features.hasOptimization + features.hasControl) * 2;

        // Environmental scoring
        scores.environmental += (features.hasEnvironmental + features.hasClimate + features.hasPollution + 
                                features.hasEcology + features.hasSustainability + features.hasRenewable) * 2;

        // Physics scoring
        scores.physics += (features.hasPhysics + features.hasQuantum + features.hasOptics + 
                          features.hasPhoton + features.hasLaser + features.hasSpectroscopy) * 2;

        // Find the highest scoring category
        const maxScore = Math.max(...Object.values(scores));
        if (maxScore === 0) return 'multidisciplinary';

        const bestCategory = Object.keys(scores).find(category => scores[category] === maxScore);
        return bestCategory || 'multidisciplinary';
    }
}

module.exports = FeatureExtractor;
