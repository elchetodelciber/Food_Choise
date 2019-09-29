const mongoose = require('mongoose');
const { Schema } = mongoose;

const recipeSchema = new Schema({  //falta agregar ingredientes, calificacion, pasos, fotos, etc
    title: { type: String, required: true },
    descripcion: { type: String, required: true },
    date: { type: Date, default: Date.now },
    categoria: {type: String, require: true}
});

module.exports = mongoose.model('receta',recipeSchema);