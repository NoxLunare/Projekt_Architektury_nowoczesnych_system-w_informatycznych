from flask import Blueprint, request, jsonify
from database.connection import get_connection
from datetime import date, datetime

from .air_quality import calculate_quality, classify

recommendations_bp = Blueprint("recommendations", __name__)

def get_anomalies(pm25: float, pm10: float, no2: float, o3: float, co: float, so2: float, bc: float, overall_score: int):
    anomalies: list[str, str] = []

    if overall_score == 0:
        if pm25 > 8:                    anomalies.append(("Podwyższone PM2.5", "Powietrze czyste, jednak odnotowano punktowy wzrost pyłu PM2.5. Alergicy i dzieci powinni unikać bezpośredniego sąsiedztwa głównych dróg w godzinach szczytu."))
        if o3 > 45:                     anomalies.append(("Podwyższony Ozon (O₃)", "Ogólny stan powietrza dobry. Ze względu na rosnące stężenie ozonu, osoby starsze powinny ograniczyć intensywny wysiłek w godzinach 12:00–16:00"))
        if co > 1.5:                    anomalies.append(("Podwyższony Tlenek Węgla (CO)", "Jakość powietrza jest prawidłowa. Wykryto jednak śladowy, lokalny wzrost CO – zaleca się zachowanie ostrożności i unikanie przebywania w pobliżu parkingów podziemnych czy tuneli."))
        if so2 > 30:                    anomalies.append(("Podwyższone SO₂", "Powietrze czyste, jednak odnotowano lokalny wzrost dwutlenku siarki (SO2). Osoby z chorobami dróg oddechowych powinny unikać rejonów z przewagą domów prywatnych w godzinach wieczornych."))
        if no2 > 30:                    anomalies.append(("Podwyższone NO₂", "Warunki ogólne dobre, ale wiatr nie rozwiał całkowicie spalin przy ulicach. Rekomendujemy spacerującym z małymi dziećmi wybór tras z dala od dróg szybkiego ruchu."))
        if pm10 > 15 and no2 > 30:      anomalies.append(("Podwyższone PM10 + NO₂", "Warunki ogólne dobre, ale jednoczesny wzrost PM10 i NO₂  sugeruje zagęszczenie ruchu. Biegaczom i rowerzystom rekomendujemy wybór tras parkowych zamiast chodników przyulicznych."))
    
    elif overall_score == 1:
        if pm10 > 20 and co > 2:        anomalies.append(("Podwyższone PM10 oraz węgiel elementarny (CO)", "Jednoczesny wzrost stężenia pyłu PM10 oraz sadzy (BC) wskazuje na obecność dymu z procesów spalania. Zaleca się ograniczenie dłuższego wietrzenia mieszkań."))
        if no2 > 40 and co > 2:         anomalies.append(("Podwyższony dwutlenek azotu (NO₂) oraz tlenek węgla (CO)", "Współwystępowanie podwyższonego poziomu dwutlenku azotu i tlenku węgla sugeruje duże zagęszczenie spalin samochodowych. Rekomendujemy spacerującym z małymi dziećmi wybór tras z dala od głównych dróg."))
        if no2 > 40 and so2 > 100:      anomalies.append(("Wysokie wskaźniki PM2.5 przy niskich poziomach gazów (NO₂, SO₂)", "Głównym źródłem obniżenia jakości powietrza jest pył drobny PM2.5, który łatwo przenika do układu krwionośnego. Osoby z problemami kardiologicznymi powinny dziś ograniczyć intensywny wysiłek fizyczny."))
        if o3 > 60:                     anomalies.append(("Wysoki poziom Ozonu (O₃) przy niskim stężeniu pyłów", "Podwyższony poziom ozonu troposferycznego przy braku klasycznego smogu pyłowego. Grupy wrażliwe (dzieci, seniorzy, astmatycy) powinny unikać intensywnej aktywności na zewnątrz w godzinach popołudniowych."))
        if so2 > 40 and pm10 > 20:      anomalies.append(("Podwyższone stężenie dwutlenku siarki (SO2) oraz pyłu PM10", "Równoległy wzrost SO2 oraz PM10 wskazuje na lokalną emisję z domowych pieców grzewczych. Astmatycy mogą odczuwać przejściowe podrażnienia dróg oddechowych – zaleca się zachowanie ostrożności."))
        if bc > 1:                      anomalies.append(("Wysokie stężenie samej sadzy (BC) blisko górnej granicy normy", "Odnotowano wysokie stężenie węgla elementarnego (sadzy BC), będącego produktem niecałkowitego spalania paliw. Kobietom w ciąży oraz rodzicom z niemowlętami odradza się dłuższego przebywania w rejonach o gęstej zabudowie."))
    
    elif overall_score == 2:
        if pm10 > 50 and bc > 3:        anomalies.append(("Krytyczne stężenie pyłów grubszych (PM10 ) oraz węgla elementarnego (BC)", "Odnotowano wysokie poziomy pyłu PM10 oraz rakotwórczej sadzy (BC) z lokalnych palenisk. Stanowczo odradza się wietrzenie mieszkań i zaleca włączenie domowych oczyszczaczy powietrza."))
        if no2 > 100 and co > 5:        anomalies.append(("Skumulowany, silny smog komunikacyjny (NO₂  oraz CO)", "Stężenie dwutlenku azotu oraz tlenku węgla osiągnęło poziom zagrażający zdrowiu. Osoby z astmą oraz rodzice z małymi dziećmi powinni całkowicie zrezygnować z przebywania w pobliżu tras przelotowych."))
        if so2 > 125 and pm10 > 50:     anomalies.append(("Bardzo wysokie wskaźniki PM2.5 przy niskich poziomach gazów (NO₂ , SO2) ", "Powietrze jest silnie zanieczyszczone pyłem drobnym PM2.5, który bezpośrednio przenika do krwiobiegu. Treningi sportowe i wszelka aktywność fizyczna na zewnątrz powinny zostać dziś odwołane."))
        if pm25 > 25 and no2 < 40 and so2 < 40:     anomalies.append(("Jednoczesny, silny wzrost dwutlenku siarki (SO2) oraz pyłu PM10", "Wysokie stężenia SO2 i PM10 wskazują na intensywne spalanie paliw stałych w okolicy. Osoby starsze oraz chorujące na przewlekłe choroby układu oddechowego powinny pozostać w domach."))

    elif overall_score == 3:
        if pm10 > 100 and bc > 6:       anomalies.append(("Skrajne, alarmowe stężenie pyłów grubszych (PM10 ) oraz węgla elementarnego (BC)", "Odnotowano wysokie poziomy pyłu PM10 oraz rakotwórczej sadzy (BC) z lokalnych palenisk. Stanowczo odradza się wietrzenie mieszkań i zaleca włączenie domowych oczyszczaczy powietrza."))
        if pm25 > 50:                   anomalies.append(("Drastyczne przekroczenie norm pyłu drobnego (PM2.5) przy niższych poziomach gazów", "Powietrze jest skażone ekstremalną ilością pyłu PM2.5, który błyskawicznie przenika do płuc i krwiobiegu. Wyjście na zewnątrz bez specjalistycznej maski z filtrem HEPA (N95/N99) grozi poważnymi konsekwencjami zdrowotnymi."))
        if so2 > 250 and pm10 > 100:    anomalies.append(("Katastrofalny, jednoczesny wzrost dwutlenku siarki (SO2) oraz pyłu PM10", "Występuje ekstremalne stężenie SO2 i PM10  wywołane masowym spalaniem najgorszej jakości paliw. Osoby z chorobami serca, astmą oraz seniorzy powinni monitorować stan zdrowia i w razie pogorszenia samopoczucia natychmiast wezwać pomoc."))
        if bc > 6:                      anomalies.append(("Krytyczne stężenie samej sadzy (BC) na skraju mierzalności stacji", "Odnotowano alarmowe stężenie czystego węgla elementarnego (sadzy BC). Ze względu na silne właściwości kancerogenne tego czynnika, bezwzględnie zakazuje się wyprowadzania dzieci na zewnątrz i dłuższego przebywania w gęstej zabudowie."))

    return anomalies

def get_recommendation(overall_score: int):
    descriptions = {idx: desc for idx, desc in zip(
            [0, 1, 2, 3], 
            ["Brak ograniczeń", "Osoby wrażliwe powinny uważać", "Ogranicz przebywanie na zewnątrz", "Zostań w domu"]
        )}

    return descriptions.get(overall_score, "")

@recommendations_bp.route("", methods=["GET"])
def recommendations():
    """
    GET /api/v1/recommendations?city=<string:city>

    Rekomendacje na podstawie aktualnych (dzisiejszych) pomiarów w mieście
    """

    city = request.args.get("city", "Poznan")

    # Pobierz najnowsze pomiary dla lokacji 

    conn = get_connection()

    latest = conn.execute("""
        SELECT ll.value, ll.datetime_utc, ll.datetime_local,
               pa.name AS parameter_name, pa.display_name, pa.units
        FROM location_latest ll
        JOIN locations l ON l.id = ll.location_id
        JOIN parameters pa ON pa.id = ll.parameter_id
        WHERE LOWER(l.locality) LIKE ?
    """, (f"%{city.lower()}%",)).fetchall()

    conn.close()

    if not latest:
        return jsonify({"error": "Not found", "message": "Lokalizacja nie istnieje albo nie posiada żadnych stacji / pomiarów"}), 404

    latest = [dict(l) for l in latest]
    latest = [l for l in latest if date.today() == datetime.fromisoformat(l.get("datetime_utc")).date()]

    pm10 = next((l for l in latest if l.get("parameter_name") == "pm10"), {})
    pm25 = next((l for l in latest if l.get("parameter_name") == "pm25"), {})
    no2 = next((l for l in latest if l.get("parameter_name") == "no2"), {})
    o3 = next((l for l in latest if l.get("parameter_name") == "o3"), {})
    co = next((l for l in latest if l.get("parameter_name") == "co"), {})
    so2 = next((l for l in latest if l.get("parameter_name") == "so2"), {})
    bc = next((l for l in latest if l.get("parameter_name") == "bc"), {})

    # Oblicz jakość metryk

    pm10_score = calculate_quality(pm10.get("value", -1), (0, 20, 50, 100))
    pm25_score = calculate_quality(pm25.get("value", -1), (0, 10, 25, 50))
    no2_score = calculate_quality(no2.get("value", -1), (0, 40, 100, 200))
    o3_score = calculate_quality(o3.get("value", -1), (0, 60, 120, 180))
    co_score = calculate_quality(co.get("value", -1), (0, 2, 5, 10))
    so2_score = calculate_quality(so2.get("value", -1), (0, 40, 125, 250))
    bc_score = calculate_quality(bc.get("value", -1), (0, 1, 3, 6))

    overall_score = max(pm25_score, pm10_score, no2_score, o3_score, co_score, so2_score, bc_score)

    return jsonify({
        "city": city,
        "quality": classify(overall_score),
        "recommendation": get_recommendation(overall_score),
        "anomalies": [
            {"name": name, "description": desc} 
            for name, desc
            in get_anomalies(pm10.get("value", -1), pm25.get("value", -1), no2.get("value", -1), 
                             o3.get("value", -1), co.get("value", -1), so2.get("value", -1), 
                             bc.get("value", -1), overall_score)
        ]
    })