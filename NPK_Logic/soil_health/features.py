"""Input parsing, alias normalization, and unit conversion."""

ALIAS_MAP = {
    "n": "Nitrogen_N_kg_ha",
    "nitrogen": "Nitrogen_N_kg_ha",
    "nitrogen_n_kg_ha": "Nitrogen_N_kg_ha",
    "p": "Phosphorus_P_kg_ha",
    "phosphorus": "Phosphorus_P_kg_ha",
    "phosphorus_p_kg_ha": "Phosphorus_P_kg_ha",
    "k": "Potassium_K_kg_ha",
    "potassium": "Potassium_K_kg_ha",
    "potassium_k_kg_ha": "Potassium_K_kg_ha",
    "ph": "pH",
    "soil_ph": "pH",
    "ec": "Electrical_Conductivity_dS_m",
    "electrical_conductivity": "Electrical_Conductivity_dS_m",
    "electrical_conductivity_ds_m": "Electrical_Conductivity_dS_m",
    "oc": "Organic_Carbon_Percent",
    "organic_carbon": "Organic_Carbon_Percent",
    "organic_carbon_percent": "Organic_Carbon_Percent",
    "s": "Sulphur_S_ppm",
    "sulphur": "Sulphur_S_ppm",
    "sulphur_s_ppm": "Sulphur_S_ppm",
    "zn": "Zinc_Zn_ppm",
    "zinc": "Zinc_Zn_ppm",
    "zinc_zn_ppm": "Zinc_Zn_ppm",
    "fe": "Iron_Fe_ppm",
    "iron": "Iron_Fe_ppm",
    "iron_fe_ppm": "Iron_Fe_ppm",
    "cu": "Copper_Cu_ppm",
    "copper": "Copper_Cu_ppm",
    "copper_cu_ppm": "Copper_Cu_ppm",
    "mn": "Manganese_Mn_ppm",
    "manganese": "Manganese_Mn_ppm",
    "manganese_mn_ppm": "Manganese_Mn_ppm",
    "b": "Boron_B_ppm",
    "boron": "Boron_B_ppm",
    "boron_b_ppm": "Boron_B_ppm",
    "crop": "Targeted_Crop",
    "crop_type": "Targeted_Crop",
    "targeted_crop": "Targeted_Crop",
    "temperature": "temperature",
    "temp": "temperature",
    "humidity": "humidity",
    "rainfall": "rainfall",
    "rain": "rainfall",
}


def normalize_input(raw: dict) -> dict:
    """Normalizes input keys and handles basic unit conversions.

    Supports N, P, K, pH and all secondary/micronutrients.
    """
    clean = {}
    for key, value in raw.items():
        if value is None:
            continue
        canonical = ALIAS_MAP.get(str(key).strip().lower())
        if not canonical:
            continue
        if canonical == "Targeted_Crop":
            clean[canonical] = str(value).strip().title()
        else:
            try:
                clean[canonical] = float(value)
            except (ValueError, TypeError):
                continue

    # Unit conversion if specified
    units = raw.get("units", {})
    if isinstance(units, dict):
        # mg/kg to kg/ha conversion (factor 2.24)
        if units.get("macro") in ["mg/kg", "ppm"]:
            for key in ["Nitrogen_N_kg_ha", "Phosphorus_P_kg_ha", "Potassium_K_kg_ha"]:
                if key in clean:
                    clean[key] = round(clean[key] * 2.24, 2)
        # P2O5 to elemental P
        if units.get("phosphorus_form") == "P2O5" and "Phosphorus_P_kg_ha" in clean:
            clean["Phosphorus_P_kg_ha"] = round(clean["Phosphorus_P_kg_ha"] * 0.4364, 2)
        # K2O to elemental K
        if units.get("potassium_form") == "K2O" and "Potassium_K_kg_ha" in clean:
            clean["Potassium_K_kg_ha"] = round(clean["Potassium_K_kg_ha"] * 0.8301, 2)

    return clean
