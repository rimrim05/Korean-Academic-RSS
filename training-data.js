// training-data.js - Academic research classification training data
module.exports = [
    // Computer Science & AI
    {
        input: {
            hasAI: 1, hasMachineLearning: 1, hasAlgorithm: 1, hasDeepLearning: 1,
            hasNeuralNetwork: 1, hasComputer: 1, hasSoftware: 1, hasSystem: 1,
            titleLength: 0.6, abstractLength: 0.8, hasMethodology: 1, hasResults: 1
        },
        output: { computerScience: 1 }
    },
    {
        input: {
            hasAI: 0, hasMachineLearning: 1, hasAlgorithm: 1, hasData: 1,
            hasModel: 1, hasComputer: 1, hasAnalysis: 1, hasOptimization: 1,
            titleLength: 0.7, abstractLength: 0.9, hasMethodology: 1, hasResults: 1
        },
        output: { computerScience: 1 }
    },

    // Biomedical Sciences
    {
        input: {
            hasClinical: 1, hasMedical: 1, hasPatient: 1, hasTreatment: 1,
            hasTherapy: 1, hasDiagnosis: 1, hasHealth: 1, hasDisease: 1,
            titleLength: 0.8, abstractLength: 0.9, hasMethodology: 1, hasResults: 1
        },
        output: { biomedical: 1 }
    },
    {
        input: {
            hasBiological: 1, hasCell: 1, hasGene: 1, hasProtein: 1,
            hasMolecular: 1, hasDNA: 1, hasRNA: 1, hasBiology: 1,
            titleLength: 0.7, abstractLength: 0.8, hasMethodology: 1, hasResults: 1
        },
        output: { biomedical: 1 }
    },

    // Cancer Research
    {
        input: {
            hasCancer: 1, hasTumor: 1, hasOncology: 1, hasChemotherapy: 1,
            hasRadiation: 1, hasMetastasis: 1, hasMalignant: 1, hasCarcinoma: 1,
            titleLength: 0.9, abstractLength: 0.9, hasMethodology: 1, hasResults: 1
        },
        output: { cancerResearch: 1 }
    },

    // Materials Science
    {
        input: {
            hasMaterial: 1, hasSynthesis: 1, hasNanoparticle: 1, hasDevice: 1,
            hasBattery: 1, hasSolar: 1, hasEnergy: 1, hasFabrication: 1,
            titleLength: 0.7, abstractLength: 0.8, hasMethodology: 1, hasResults: 1
        },
        output: { materialsScience: 1 }
    },
    {
        input: {
            hasPolymers: 1, hasComposite: 1, hasNanomaterials: 1, hasSemiconductor: 1,
            hasElectronic: 1, hasOptical: 1, hasMechanical: 1, hasCharacterization: 1,
            titleLength: 0.6, abstractLength: 0.7, hasMethodology: 1, hasResults: 1
        },
        output: { materialsScience: 1 }
    },

    // Neuroscience
    {
        input: {
            hasBrain: 1, hasNeuron: 1, hasCognitive: 1, hasMemory: 1,
            hasAlzheimer: 1, hasParkinson: 1, hasNeurological: 1, hasBehavior: 1,
            titleLength: 0.8, abstractLength: 0.9, hasMethodology: 1, hasResults: 1
        },
        output: { neuroscience: 1 }
    },

    // Engineering
    {
        input: {
            hasEngineering: 1, hasTechnology: 1, hasManufacturing: 1, hasDesign: 1,
            hasOptimization: 1, hasControl: 1, hasAutomation: 1, hasRobotics: 1,
            titleLength: 0.6, abstractLength: 0.7, hasMethodology: 1, hasResults: 1
        },
        output: { engineering: 1 }
    },

    // Environmental Science
    {
        input: {
            hasEnvironmental: 1, hasClimate: 1, hasPollution: 1, hasEcology: 1,
            hasSustainability: 1, hasRenewable: 1, hasCarbon: 1, hasWater: 1,
            titleLength: 0.7, abstractLength: 0.8, hasMethodology: 1, hasResults: 1
        },
        output: { environmental: 1 }
    },

    // Physics
    {
        input: {
            hasPhysics: 1, hasQuantum: 1, hasOptics: 1, hasPhoton: 1,
            hasLaser: 1, hasSpectroscopy: 1, hasTheoretical: 1, hasExperimental: 1,
            titleLength: 0.6, abstractLength: 0.7, hasMethodology: 1, hasResults: 1
        },
        output: { physics: 1 }
    }
];
