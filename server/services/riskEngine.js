const RISK_WEIGHTS = {
    FACE_MISSING: 5,
    MULTIPLE_FACES: 10,
    TAB_SWITCH: 3,
    INACTIVITY: 2,
    KEYSTROKE_ANOMALY: 4
};

function calculateRiskScore(events) {
    let riskScore = 0;
    
    events.forEach(event => {
        const weight = RISK_WEIGHTS[event.eventType] || event.riskWeight || 0;
        riskScore += weight;
    });

    let riskLevel = 'LOW';
    if (riskScore >= 20) {
        riskLevel = 'HIGH';
    } else if (riskScore >= 10) {
        riskLevel = 'MEDIUM';
    }

    return { riskScore, riskLevel };
}

module.exports = {
    RISK_WEIGHTS,
    calculateRiskScore
};
