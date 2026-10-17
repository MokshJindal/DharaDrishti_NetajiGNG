"""Standard Indian Council of Agricultural Research (ICAR) nutrient thresholds.

Used to identify specific nutrient deficiencies and soil reaction status.
"""

# ICAR Standard Thresholds for Soil Testing
THRESHOLDS = {
    "Nitrogen": {"low": 280, "high": 560, "unit": "kg/ha"},
    "Phosphorus": {"low": 10, "high": 25, "unit": "kg/ha"},
    "Potassium": {"low": 108, "high": 280, "unit": "kg/ha"},
    "Organic_Carbon": {"low": 0.5, "high": 0.75, "unit": "%"},
    "Sulphur": {"critical": 10.0, "unit": "ppm"},
    "Zinc": {"critical": 0.6, "unit": "ppm"},
    "Iron": {"critical": 4.5, "unit": "ppm"},
    "Copper": {"critical": 0.2, "unit": "ppm"},
    "Manganese": {"critical": 2.0, "unit": "ppm"},
    "Boron": {"critical": 0.5, "unit": "ppm"},
}


def rate_ph(ph: float) -> str:
    """Classifies soil pH reaction."""
    if ph < 5.5:
        return "Strongly Acidic"
    elif ph < 6.5:
        return "Moderately Acidic"
    elif ph <= 7.5:
        return "Neutral / Optimal"
    elif ph <= 8.5:
        return "Moderately Alkaline"
    else:
        return "Strongly Alkaline"


def evaluate_nutrients(inputs: dict) -> dict:
    """Evaluates individual nutrients against standard ICAR thresholds.

    Returns:
        assessments: dict mapping nutrient name to its rating (Low/Medium/High or Adequate/Deficient)
        deficiencies: list of human-readable deficiency messages
    """
    assessments = {}
    deficiencies = []

    # Nitrogen
    if inputs.get("Nitrogen_N_kg_ha") is not None:
        val = inputs["Nitrogen_N_kg_ha"]
        if val < THRESHOLDS["Nitrogen"]["low"]:
            status = "Low"
            deficiencies.append(f"Nitrogen is Low ({val} kg/ha < {THRESHOLDS['Nitrogen']['low']} kg/ha)")
        elif val > THRESHOLDS["Nitrogen"]["high"]:
            status = "High"
        else:
            status = "Medium / Adequate"
        assessments["Nitrogen"] = {"value": val, "unit": "kg/ha", "status": status}

    # Phosphorus
    if inputs.get("Phosphorus_P_kg_ha") is not None:
        val = inputs["Phosphorus_P_kg_ha"]
        if val < THRESHOLDS["Phosphorus"]["low"]:
            status = "Low"
            deficiencies.append(f"Phosphorus is Low ({val} kg/ha < {THRESHOLDS['Phosphorus']['low']} kg/ha)")
        elif val > THRESHOLDS["Phosphorus"]["high"]:
            status = "High"
        else:
            status = "Medium / Adequate"
        assessments["Phosphorus"] = {"value": val, "unit": "kg/ha", "status": status}

    # Potassium
    if inputs.get("Potassium_K_kg_ha") is not None:
        val = inputs["Potassium_K_kg_ha"]
        if val < THRESHOLDS["Potassium"]["low"]:
            status = "Low"
            deficiencies.append(f"Potassium is Low ({val} kg/ha < {THRESHOLDS['Potassium']['low']} kg/ha)")
        elif val > THRESHOLDS["Potassium"]["high"]:
            status = "High"
        else:
            status = "Medium / Adequate"
        assessments["Potassium"] = {"value": val, "unit": "kg/ha", "status": status}

    # pH
    if inputs.get("pH") is not None:
        val = inputs["pH"]
        status = rate_ph(val)
        assessments["pH"] = {"value": val, "status": status}
        if val < 5.5:
            deficiencies.append(f"Soil is Strongly Acidic (pH {val}); liming may be required.")
        elif val > 8.5:
            deficiencies.append(f"Soil is Strongly Alkaline (pH {val}); gypsum/reclamation may be needed.")

    # Electrical Conductivity (Salinity)
    if inputs.get("Electrical_Conductivity_dS_m") is not None:
        val = inputs["Electrical_Conductivity_dS_m"]
        status = "Normal" if val < 1.0 else ("Critical for sensitive crops" if val <= 2.0 else "High Salinity")
        assessments["EC"] = {"value": val, "unit": "dS/m", "status": status}
        if val > 2.0:
            deficiencies.append(f"High soil salinity (EC {val} dS/m > 2.0 dS/m)")

    # Organic Carbon
    if inputs.get("Organic_Carbon_Percent") is not None:
        val = inputs["Organic_Carbon_Percent"]
        status = "Low" if val < 0.5 else ("High" if val > 0.75 else "Medium")
        assessments["Organic_Carbon"] = {"value": val, "unit": "%", "status": status}
        if val < 0.5:
            deficiencies.append(f"Organic Carbon is Low ({val}% < 0.5%)")

    # Micronutrients
    micro_mapping = [
        ("Zinc_Zn_ppm", "Zinc"),
        ("Iron_Fe_ppm", "Iron"),
        ("Copper_Cu_ppm", "Copper"),
        ("Manganese_Mn_ppm", "Manganese"),
        ("Boron_B_ppm", "Boron"),
        ("Sulphur_S_ppm", "Sulphur"),
    ]
    for key, name in micro_mapping:
        if inputs.get(key) is not None:
            val = inputs[key]
            crit = THRESHOLDS[name]["critical"]
            if val < crit:
                assessments[name] = {"value": val, "unit": "ppm", "status": "Deficient"}
                deficiencies.append(f"{name} is Deficient ({val} ppm < {crit} ppm)")
            else:
                assessments[name] = {"value": val, "unit": "ppm", "status": "Adequate"}

    return {"assessments": assessments, "deficiencies": deficiencies}
