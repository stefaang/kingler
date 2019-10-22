

def getlnglat(data: dict):
    """Return a position lnglat tuple from a data dict"""
    return float(data.get('lng', 0)), float(data.get('lat', 0))
