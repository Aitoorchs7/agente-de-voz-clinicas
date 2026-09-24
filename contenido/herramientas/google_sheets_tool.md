---
herramienta: google_sheets_tool
provisional: si
---
Apunta UNA fila en la hoja de llamadas de la clinica. Solo escribe: no sirve para leer ni consultar. Si hace falta indicar la hoja, el spreadsheetId es EXACTAMENTE {{hoja_id}} y el range es EXACTAMENTE Llamadas!A:Z. Nunca inventes otros ni los acortes: si te equivocas la fila se pierde sin avisar. En values van ocho valores en este orden: fecha y hora de la llamada (2026-09-24 16:23), telefono, nombre, motivo, resultado (cita / informacion / urgencia / sin resolver), fecha de la cita (2026-09-25) o vacio, hora de la cita (17:00) o vacio, y una nota corta o vacio.
