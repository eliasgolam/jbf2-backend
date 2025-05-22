module.exports = function (req, res, next) {
  if (!req.session || !req.session.kundenId) {
    return res.status(400).json({ message: "❌ Kein aktiver Kunde in der Session. Bitte zuerst Kunden auswählen." });
  }
  next();
};
