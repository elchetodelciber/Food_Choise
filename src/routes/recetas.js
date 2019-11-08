const express = require('express');
const router = express.Router();
const fs = require('fs-extra'); //file system sirve para borrar los archivos temporales
const Users = require('../models/user-model')
const Recetas = require('../models/recetas');
const Categoria = require('../models/categoria');
const Calificacion = require('../models/calificacion');
const Favoritos = require('../models/favoritos');
const Visitas=require('../models/visitas')
const Ingrediente = require('../models/ingrediente');
const cloudinary = require('cloudinary');

cloudinary.config({ //sesion de cloudinary
    cloud_name: 'elchetodelciber95',
    api_key: '193479116246688',
    api_secret: 'AihAtz1kcPn-J5EIMk8AJrvPNzM'
})

Array.prototype.unique=function(a){
    return function(){return this.filter(a)}}(function(a,b,c){return c.indexOf(a,b+1)<0
  });

//check if logged
const authCheck = (req, res, next) => {
    if (req.user) {
        //if logged in
        next();

    } else {
        //
        //if user is not logged in
        res.redirect('/auth/google');
    }
};

router.post('/getIng', async (req,res) => {
    var url = "ing"
    const ing = await Ingrediente.find();
    res.send(getInput(req,url,ing))
})

router.post('/getCat', async (req,res) => {
    var url = "cat"
    var cat = await Categoria.find();
    for (let i = 0; i < cat.length; i++) {
        if (cat[i].tipo == "sub") {
            for (let j = 1; j < cat[i].subcategorias.length; j++) {
                cat.push(cat[i].subcategorias[j])
            }
            cat[i] = cat[i].subcategorias[0];
        }
        
    }
    res.send(getInput(req,url,cat));
})

function getInput(req,url,destino) {
    
    const {
        key
    } = req.body;
    const errors = [];
    var keys = key.split(" ");
    var final = []
    var chars={
        "á":"a", "é":"e", "í":"i", "ó":"o", "ú":"u",
        "à":"a", "è":"e", "ì":"i", "ò":"o", "ù":"u",
        "Á":"A", "É":"E", "Í":"I", "Ó":"O", "Ú":"U",
        "À":"A", "È":"E", "Ì":"I", "Ò":"O", "Ù":"U"}
        
    var expr=/[áàéèíìóòúùñ]/ig;
    
    for (let j = 0; j < destino.length; j++) {
        for (let i = 0; i < keys.length; i++) {
            var input=keys[i].replace(expr,function(e){return chars[e]});
            if (url == "ing") {
                var output = destino[j].Descripcion.replace(expr,function(e){return chars[e]});
            } else {
                var output = destino[j].descripcion.replace(expr,function(e){return chars[e]});
            }
            var _regex = new RegExp(input, "i");
            var match = output.match(_regex);
            if(match){
                final.push(destino[j])
                i = keys.length
            }
            
        }
        
    }
    var html = '';
    for (let i = 0; i < final.length; i++) {
        if (url == "ing") {
            html += `<div><a class="suggest-element" data="${final[i].Descripcion}" id="${final[i]._id}">${final[i].Descripcion}</a></div>`;
        } else {
            html += `<div><a class="suggest-element" data="${final[i].descripcion}" id="${final[i]._id}">${final[i].descripcion}</a></div>`;
        }
    }
    
    return html;
}

router.post('/getRecetasCat', async (req,res) => {
    const {
        key
    } = req.body;
    const recetas = await Recetas.find({categoria : key});
    var html = '';
    for (let i = 0; i < recetas.length; i++) {
        html += `<div class="col-md-4 mt-5 ">
                    <div class="card zoom">
                        <p id="id_tarjetaReceta" style="display:none">${recetas[i]._id}</p>
                        <a href="/recetas/ver/${recetas[i]._id}" class="card-body">
                            <h4 class="card-title txt-centrado">
                                ${recetas[i].title}
                            </h4>
                            {{>calificacion}} 
                            <br>
                            <img src="${recetas[i].imagenURL}" class="img-fluid img-completa rounded">
                            <h6 class="txt-centrado txt-categoria my-auto"><img class="img-circular" width="25" height="25" src="${recetas[i].owenImg}" alt="">${recetas[i].owen}</h6>
                        </a>
                    </div>
                </div>`;
    }
    
    res.send(html);
})

router.get('/recetas', async (req, res) => {
    const receta = await Recetas.find().sort({
        date: 'desc'
    });
    var allCat = await Categoria.find()
    
    
    //var categRec = await Categoria.findById(receta.categoria);
    for (let i = 0; i < receta.length; i++) {
        var categRec;
        if (receta[i].subcategoria) {
            categRec = await Categoria.findById(receta[i].padre);
            for (let j = 0; j < categRec.subcategorias.length; j++) {
                if (receta[i].categoria == categRec.subcategorias[j]._id) {
                    receta[i].categoria = categRec.subcategorias[j].descripcion;
                }
            }
        } else {
            categRec = await Categoria.findById(receta[i].categoria);
            receta[i].categoria = categRec.descripcion;
        }
        var owenReceta = await Users.findById(receta[i].owen);
        receta[i].owen = owenReceta.username;
        receta[i].owenImg = owenReceta.thumbnail;
        const calificacionesProm = await Calificacion.find({
            id_receta: receta[i]._id
        });
        if (calificacionesProm.length > 0 && calificacionesProm) {
            var totalCal = 0
            for (let i = 0; i < calificacionesProm.length; i++) {
                totalCal = totalCal + calificacionesProm[i].calificacion;
            }
            var promCal = totalCal / calificacionesProm.length;
            receta[i].calificacion = promCal;
            
        }
    }
    if (req.user) {
        var allCat = await Categoria.find()
        res.render('recetas/all-recetas', {
            allCat,
            receta,
            user: req.user
        });
    } else {
        var allCat = await Categoria.find()
        res.render('recetas/all-recetas', {
            allCat,
            receta
        });
    }
})

router.get('/recetas/ver/:id', async (req, res) => {
    const receta = await Recetas.findById(req.params.id); //trae la receta elegida
    var categRec;
    if (receta.subcategoria) {
        categRec = await Categoria.findById(receta.padre);
        for (let j = 0; j < categRec.subcategorias.length; j++) {
            if (receta.categoria == categRec.subcategorias[j]._id) {
                receta.categoria = categRec.subcategorias[j].descripcion;
            }
        }
    } else {
        categRec = await Categoria.findById(receta.categoria);
        receta.categoria = categRec.descripcion;
    }
    const verVisitas=await Visitas.findOne({id_receta:req.params.id}); //trae las visitas de la receta elegida
    var visitasTotales= verVisitas.id_visitantes.length;
    
    var visitante = 0
    
    verVisitas.id_visitantes.forEach(id => {
        if (req.user && id == req.user.id) {
            visitante = 1;
        }
    });
                //---------------------- SI ESTA LOGUEADO ----------------------
    if(req.user && visitante == 1){
        
        const calificaciones = await Calificacion.findOne({
            id_calificante: req.user.id,
            id_receta:req.params.id
        });
    
        const calificacionesProm = await Calificacion.find({
            id_receta: req.params.id
        });
        var totalCal = 0
        for (let i = 0; i < calificacionesProm.length; i++) {
            totalCal = totalCal + calificacionesProm[i].calificacion;
        }
        var promCal = totalCal / calificacionesProm.length;
        
        if (req.user.id && calificaciones) {
            
            var allCat = await Categoria.find()
            res.render('recetas/ver-receta', {
                allCat,
                receta,
                user: req.user,
                categRec,
                calificaciones,
                promCal,
                visitasTotales
            });
            
        } else if (req.user) {
            
            var allCat = await Categoria.find()
            res.render('recetas/ver-receta', {
                allCat,
                receta,
                user: req.user,
                categRec,
                promCal,
                visitasTotales
            });
        }
    }
    // ---------------------------------- SI NO ESTA LOGUEADO ------------------------- 
    else if (req.user) {
        
        await Visitas.findOneAndUpdate({id_receta:req.params.id},{
            $push : {id_visitantes:req.user.id}
        })
        var allCat = await Categoria.find()
        res.render('recetas/ver-receta', {
            allCat,
            receta,
            categRec,
            promCal,
            user: req.user,
            visitasTotales
        });
    }else{
        
        await Visitas.findOneAndUpdate({id_receta:req.params.id},{
            $push : {id_visitantes:"usuarioTemp"}
        })
        var allCat = await Categoria.find()
        res.render('recetas/ver-receta', {
            allCat,
            receta,
            categRec,
            promCal,
            visitasTotales
        });
    }
})

    //-------------------------------------- CREACION DE RECETA ---------------------------------------------

    router.get('/recetas/new', authCheck, async (req, res) => {
    //Obtengo todas las categorias       
    const cat = await Categoria.find();

    //Obtengo todos los ingredientes
    const ing = await Ingrediente.find();

    var allCat = await Categoria.find()
    res.render('recetas/new-receta', {
        allCat,
        user: req.user,
        cat,
        ing
    });
})

router.post('/recetas/new-receta', authCheck, async (req, res) => {
    const {
        title,
        descripcion,
        categoria,
        contador
    } = req.body;
    const ingredientesForm = [];
    
    if (contador > 1) {
        req.body.ingredientesNom.forEach(element => {
            ingredientesForm.push(
                element
            )
        });
    }else{
        ingredientesForm.push(req.body.ingredientesNom)
    }
    
    const cantIng = req.body.cantIng
    const errors = [];
    if (!title) {
        errors.push({
            text: 'Completa el titulo'
        });
    }
    if (!descripcion) {
        errors.push({
            text: 'Escribe una descripcion'
        });
    }
    if (!categoria) {
        errors.push({
            text: 'Selecciona una categoria'
        });
    }
    if (categoria < 1 || categoria > 5) {
        errors.push({
            text: 'Selecciona una categoria valida'
        });
    }
    if (!req.file) { //valida que se mande una imagen al crear la receta (agregar cuando se edita editar)
        errors.push({
            text: 'Selecciona una imagen'
        });
    }
    if (!ingredientesForm[0]) {
        errors.push({
            text: 'Selecciona al menos un ingrediente'
        });
    }else{
        var ingredientes = [];
        for (let i = 0; i < ingredientesForm.length; i++) {
            
            
            var nomIngredienteDB = await Ingrediente.findById(ingredientesForm[i]);
            
            var index_cant = i+i;
            if (parseFloat(cantIng[index_cant]) < 0) {
                errors.push({
                    text: 'No puede ingresar un valor negativo en la cantidad a usar del ingrediente'
                })
            } else {
                ingredientes.push({
                    nombre : nomIngredienteDB.Descripcion,
                    cantidad : cantIng[index_cant],
                    unidad: cantIng[index_cant + 1]
                })
            }
        }
    }
    
    var valCat = categoria.split("|");
    var tipo = valCat[1];
    var categoriaFinal = valCat[0];
    if (tipo == "cat") {
        tipo = false;
        
    }else{
        tipo = true
        var padre = valCat[2];
    }


    if (errors.length > 0) {
        var allCat = await Categoria.find()
        res.render('recetas/new-receta', {
            allCat,
            errors,
            user: req.user,
            title,
            descripcion,
            categoria
        })
    } else {
        const resultado = await cloudinary.v2.uploader.upload(req.file.path); //esta linea sube el archivo a cloudinary y guarda los datos resultantes
        const owen = req.user.id;
        var newReceta = {};
        
        if (tipo) {
            
            newReceta = new Recetas({
                title,
                owen,
                descripcion,
                categoria : categoriaFinal,
                subcategoria : true,
                padre,
                ingredientes,
                imagenURL: resultado.url,
                imagenCloud: resultado.public_id
            });
        } else {
            
            newReceta = new Recetas({
                title,
                owen,
                descripcion,
                categoria : categoriaFinal,
                subcategoria : false,
                ingredientes,
                imagenURL: resultado.url,
                imagenCloud: resultado.public_id
            });
        }
        
        await newReceta.save();
        await fs.unlink(req.file.path);
        const crearVisitas = new Visitas({
            id_receta: newReceta._id,
            id_visitantes: req.user.id
        })
        await crearVisitas.save();
        res.redirect('/recetas/mis-recetas');
    }
})

// --------------------------------------- VER MIS RECETAS ---------------------------------------

router.get('/recetas/mis-recetas', authCheck, async (req, res) => { 
    
    const usuario = req.user.id;
    const query = {
        owen: usuario
    };
    const resultado = await Recetas.find(query).sort({
        date: 'desc'
    });
    for (let i = 0; i < resultado.length; i++) {
        
        var categRec;
        
        if (resultado[i].subcategoria) {
            
            
            categRec = await Categoria.findById(resultado[i].padre);
            for (let j = 0; j < categRec.subcategorias.length; j++) {
                if (resultado[i].categoria == categRec.subcategorias[j]._id) {
                    resultado[i].categoria = categRec.subcategorias[j].descripcion;
                }
                
            }
        } else {
            categRec = await Categoria.findById(resultado[i].categoria);
            resultado[i].categoria = categRec.descripcion;
        }
        
        var owenReceta = await Users.findById(resultado[i].owen);
        resultado[i].owen = owenReceta.username;
        resultado[i].owenImg = owenReceta.thumbnail;
        const calificacionesProm = await Calificacion.find({
            id_receta: resultado[i]._id
        });
        var totalCal = 0
        if (calificacionesProm.length > 0 && calificacionesProm) {
            for (let i = 0; i < calificacionesProm.length; i++) {
                totalCal = totalCal + calificacionesProm[i].calificacion;
            }
            var promCal = totalCal / calificacionesProm.length;
            resultado[i].calificacion = promCal;
            
        }
    }

    var allCat = await Categoria.find()
    res.render('recetas/mis-recetas', {
        allCat,
        resultado,
        user: req.user
    });
})

// -----------------------------------------ruta para ingresar a la edicion------------------------------------

router.get('/recetas/editar/:id', authCheck, async (req, res) => {
    const datosEditar = await Recetas.findById(req.params.id);
    const errors = [];
    if (req.user.id == datosEditar.owen) {
        //Obtengo todas las categorias       
        const cat = await Categoria.find();                                         

        //Obtengo todos los ingredientes
        const ing = await Ingrediente.find();
        var allCat = await Categoria.find()
                
        var categoriaActual = Object;
        if (!datosEditar.subcategoria){
            categoriaActual = await Categoria.findById(datosEditar.categoria)
        }else {            
            categoriaActual = await Categoria.findOne({
                subcategorias: { $elemMatch: { _id: datosEditar.categoria } }})                            
        }                              


        res.render('recetas/editar-receta', { 
            allCat,
            datosEditar,
            user: req.user,
            cat,
            ing,
            categoriaActual
        });
    } else {
        errors.push({
            text: 'Usted no tiene autorización para editar esta receta'
        });
    }
    if (errors.length > 0) {
        var allCat = await Categoria.find()
        res.render(`recetas/error`, {
            allCat,
            errors,
            user: req.user
        })
    }
});

router.put('/recetas/editar', authCheck, async (req, res) => {
    const {
        title,
        descripcion,
        categoria
    } = req.body; //se toma los datos del form
    const ingredientesForm = [];
    ingredientesForm.push(
        req.body.ingredientesNom
    )
    const cantIng = req.body.cantIng
    if (title) {
        await Recetas.findByIdAndUpdate(req.query.id, {
            title
        });
    }
    if (descripcion) {
        await Recetas.findByIdAndUpdate(req.query.id, {
            descripcion
        });
    }
    if (categoria) {
        await Recetas.findByIdAndUpdate(req.query.id, {
            categoria
        });
    }
    if (ingredientesForm[0]) {
        
        await Recetas.findByIdAndUpdate(req.query.id, {
            ingredientes : []
        });
        
        for (let i = 0; i < ingredientesForm.length; i++) {
            
            var nomIngredienteDB = await Ingrediente.findById(ingredientesForm[i]);
            var index_cant = i+i;
            
            await Recetas.findByIdAndUpdate(req.query.id, {
                $push : {ingredientes : {nombre : nomIngredienteDB.Descripcion , cantidad : cantIng[index_cant], unidad : cantIng[index_cant + 1]}}
            });
        }
        
    }

    if (req.file) {
        const resultado = await cloudinary.v2.uploader.upload(req.file.path);
        await Recetas.findByIdAndUpdate(req.query.id, {
            imagenURL: resultado.url,
            imagenCloud: resultado.public_id
        });
        await fs.unlink(req.file.path);
    }
    res.redirect('/recetas/mis-recetas');

})

router.delete('/recetas/delete', authCheck, async (req, res) => { //hay que hacer que elimine tambien su calificacion si esta en un documento aparte
    const usuario = req.user.id;
    const resultado = await Recetas.findById(req.query.id);
    const errors = [];
    if (usuario == resultado.owen) {
        await Recetas.findByIdAndRemove(req.query.id);   //borra la receta de la base
        await Calificacion.remove({id_receta:resultado._id});
        await cloudinary.v2.uploader.destroy(resultado.imagenCloud);
        res.redirect('/recetas/mis-recetas');
    } else {
        errors.push({
            text: 'Usted no tiene autorización para eliminar esta receta'
        });
    }
    if (errors.length > 0) {
        var allCat = await Categoria.find()
        res.render(`recetas/error`, {
            allCat,
            errors,
            user: req.user
        })
    }
});
// -----------------------------           RUTAS DE CALIFICACIÓN            ----------------------------------------------------------------------//

router.post('/recetas/calificar/:id', async (req, res) => {

    const {
        calif
    } = req.body
    const receta = req.params.id;
    const user = req.user.id;
    const calificaciones = await Calificacion.find({
        id_calificante: user,
        id_receta: receta
    });
    
    if (calificaciones.length == 0) {
        const newCalif = new Calificacion({
            id_receta: receta,
            id_calificante: user,
            calificacion: parseInt(calif)
        });
        await newCalif.save();
        //res.send(`<script>alert("Calificacion de la receta completada"); window.location.href = "/recetas/ver/${receta}"</script>`);
        res.send(`<script>window.location.href = "/recetas/ver/${receta}"</script>`);
    } else {
        
        //res.send(`<script>alert("Ya ha calificado anteriormente esta receta"); window.location.href = "/recetas/ver/${receta}"</script>`);
        res.send(`<script> window.location.href = "/recetas/ver/${receta}"</script>`);
    }



})

// -----------------------------           RUTAS DE BUSQUEDA            ----------------------------------------------------------------------//

router.post('/busqueda/1', async (req, res) => { //busqueda por titulo
    const {
        title
    } = req.body;
    
    const errors = [];
    if (!title) {
        errors.push({
            text: 'seleccione al menos un titulo'
        });
        var allCat = await Categoria.find()
        res.render('recetas/all-recetas', {
            allCat,
            errors,
            user: req.user
        })
    } else {
        var titulos = title.split(" ");
        const Receta = await Recetas.find();
        var recetasFinal = []
        for (let j = 0; j < Receta.length; j++) {
            for (let i = 0; i < titulos.length; i++) {
                var _regex = new RegExp(titulos[i], "i");
                var match = Receta[j].title.match(_regex);
                if(match){
                    recetasFinal.push(Receta[j])
                    i = titulos.length
                }
                
            }
            
        }
        for (let i = 0; i < recetasFinal.length; i++) {
            var categRec;
            if (recetasFinal[i].subcategoria) {
                categRec = await Categoria.findById(recetasFinal[i].padre);
                for (let j = 0; j < categRec.subcategorias.length; j++) {
                    if (recetasFinal[i].categoria == categRec.subcategorias[j]._id) {
                        recetasFinal[i].categoria = categRec.subcategorias[j].descripcion;
                    }
                }
            } else {
                categRec = await Categoria.findById(recetasFinal[i].categoria);
                recetasFinal[i].categoria = categRec.descripcion;
            }
            var owenReceta = await Users.findById(recetasFinal[i].owen);
            recetasFinal[i].owen = owenReceta.username;
            recetasFinal[i].owenImg = owenReceta.thumbnail;
            const calificacionesProm = await Calificacion.find({
                id_receta: recetasFinal[i]._id
            });
            var totalCal = 0
            for (let i = 0; i < calificacionesProm.length; i++) {
                totalCal = totalCal + calificacionesProm[i].calificacion;
            }
            var promCal = totalCal / calificacionesProm.length;
            recetasFinal[i].calificacion = promCal;
        }
        
        

        var allCat = await Categoria.find()
        res.render("recetas/recetas-titulo", {
            allCat,
            Receta : recetasFinal,
            title,
            user: req.user
        });
    }
})

router.get('/busqueda/2', async (req, res) => { //busqueda por ingredientes
    const ing = await Ingrediente.find().sort({
        Descripcion: 'asc'
    });
    
    var allCat = await Categoria.find()
    res.render('recetas/buscar-ingredientes', {
        allCat,
        ing,
        user: req.user
    });
})
router.post('/busqueda/2', async (req, res) => { //donde llega el formulario de ingredientes
    const {
        busqueda,
        contador,
        strict
    } = req.body;
    const ing = await Ingrediente.find().sort({
        Descripcion: 'asc'
    });

    var catBusqueda = []
    
    if (contador == '1') {
        catBusqueda.push(busqueda)
    }else{
        catBusqueda = busqueda
    }
    

    const errors = [];
    if (!busqueda) {
        errors.push({
            text: 'seleccione al menos una categoría'
        });
        var allCat = await Categoria.find()
        res.render('recetas/recetas-categoria', {
            allCat,
            errors,
            user: req.user
        })
    } else {
        var Receta = []
        var comparador = []
        for (let i = 0; i < catBusqueda.length; i++) {
            var tempRec = await Recetas.find({
                ingredientes: { $elemMatch: { nombre: catBusqueda[i] }}})
            
            
            if (tempRec.length != 0) {
                for (let j = 0; j < tempRec.length; j++) {
                    Receta.push(tempRec[j]);
                    comparador.push(tempRec[j]);
                }
            }
        }
        var hash = {};
        Receta = Receta.filter(function(current) {
        var exists = !hash[current._id] || false;
        hash[current._id] = true;
        return exists;
        });
        if(Receta.length != 0){
            for (let i = 0; i < Receta.length; i++) {
                var categRec;
                
            if (Receta[i].subcategoria) {
                categRec = await Categoria.findById(Receta[i].padre);
                for (let j = 0; j < categRec.subcategorias.length; j++) {
                    if (Receta[i].categoria == categRec.subcategorias[j]._id) {
                        Receta[i].categoria = categRec.subcategorias[j].descripcion;
                    }
                }
            } else {
                categRec = await Categoria.findById(Receta[i].categoria);
                Receta[i].categoria = categRec.descripcion;
            }
                var owenReceta = await Users.findById(Receta[i].owen);
                Receta[i].owen = owenReceta.username;
                Receta[i].owenImg = owenReceta.thumbnail;
                const calificacionesProm = await Calificacion.find({
                    id_receta: Receta[i]._id
                });
                var totalCal = 0
                for (let i = 0; i < calificacionesProm.length; i++) {
                    totalCal = totalCal + calificacionesProm[i].calificacion;
                }
                var promCal = totalCal / calificacionesProm.length;
                Receta[i].calificacion = promCal;
            }
            
            
            var allCat = await Categoria.find()
            res.render('recetas/recetas-ingredientes', {
                allCat,
                Receta,
                ing,
                user: req.user
            });
        }else{
            errors.push({
                text: 'No se encontraron recetas'
            });
            var allCat = await Categoria.find()
            res.render('recetas/recetas-categoria', {
                allCat,
                ing,
                errors,
                user: req.user
            })
        }
    }
})

router.post('/busqueda/3', async (req, res) => { //donde llega el formulario de ingredientes
    const {
        busqueda,
        contador
    } = req.body;
    
    var catBusqueda = []
    
    if (contador == '1') {
        catBusqueda.push(busqueda)
    }else{
        catBusqueda = busqueda
    }
    
    const ing = await Categoria.find().sort({
        descripcion: 'asc'
    });
    

    const errors = [];
    if (!busqueda) {
        errors.push({
            text: 'seleccione al menos una categoría'
        });
        var allCat = await Categoria.find()
        res.render('recetas/recetas-categoria', {
            allCat,
            ing,
            errors,
            user: req.user
        })
    } else {
        var Categ = []
        for (let i = 0; i < catBusqueda.length; i++) {
            
            var find = await Categoria.findOne({
                descripcion: catBusqueda[i]
            })
            if (!find) {
                find = await Categoria.findOne({
                    subcategorias: { $elemMatch: { descripcion: catBusqueda[i] } }
                })
                if (find.length != 0) {
                    for (let j = 0; j < find.subcategorias.length; j++) {
                        if (find.subcategorias[j].descripcion == catBusqueda[i]) {
                            Categ.push(find.subcategorias[j])
                        }
                        
                    }
                }
            }else{
                Categ.push(find)
            }
            
            
        }
        var Receta = []
        for (let i = 0; i < Categ.length; i++) {
            var temporal = await Recetas.find();
            
            
            
            
            var tempRec = await Recetas.find({categoria : Categ[i]._id})
            
            
            if (tempRec.length != 0) {
                for (let j = 0; j < tempRec.length; j++) {
                    Receta.push(tempRec[j]);
                }
            }
        }
        
        
        if(Receta.length != 0){
            for (let i = 0; i < Receta.length; i++) {
                var categRec;
                
            if (Receta[i].subcategoria) {
                categRec = await Categoria.findById(Receta[i].padre);
                for (let j = 0; j < categRec.subcategorias.length; j++) {
                    if (Receta[i].categoria == categRec.subcategorias[j]._id) {
                        Receta[i].categoria = categRec.subcategorias[j].descripcion;
                    }
                }
            } else {
                categRec = await Categoria.findById(Receta[i].categoria);
                Receta[i].categoria = categRec.descripcion;
            }
                var owenReceta = await Users.findById(Receta[i].owen);
                Receta[i].owen = owenReceta.username;
                Receta[i].owenImg = owenReceta.thumbnail;
                const calificacionesProm = await Calificacion.find({
                    id_receta: Receta[i]._id
                });
                var totalCal = 0
                for (let i = 0; i < calificacionesProm.length; i++) {
                    totalCal = totalCal + calificacionesProm[i].calificacion;
                }
                var promCal = totalCal / calificacionesProm.length;
                Receta[i].calificacion = promCal;
            }
            
            
            var allCat = await Categoria.find()
            res.render('recetas/recetas-ingredientes', {
                allCat,
                Receta,
                ing,
                user: req.user
            });
        }else{
            errors.push({
                text: 'No se encontraron recetas'
            });
            var allCat = await Categoria.find()
            res.render('recetas/recetas-categoria', {
                allCat,
                ing,
                errors,
                user: req.user
            })
        }
    }
})


router.get('/categoria/:id', async (req, res) => { //falta completar !!!!!
    const categoria = req.params.id;
    const cat = await Categoria.find().sort({ //la busqueda se ordena de la 'a' a la 'z'
        descripcion: 'asc'
    }); 
    
    const errors = [];
    if (!categoria) {
        errors.push({
            text: 'seleccione al menos una categoria'
        });
        var allCat = await Categoria.find()
        res.render('recetas/recetas-categoria', {
            allCat,
            cat,
            errors,
            user: req.user
        })
    } else {
        const Receta = await Recetas.find({
            categoria: {
                $in: categoria
            }
        }) //ingresar parametro de busqueda (revisar si funciona)
        for (let i = 0; i < Receta.length; i++) {
            var categRec;
            if (Receta[i].subcategoria) {
                categRec = await Categoria.findById(Receta[i].padre);
                for (let j = 0; j < categRec.subcategorias.length; j++) {
                    if (Receta[i].categoria == categRec.subcategorias[j]._id) {
                        Receta[i].categoria = categRec.subcategorias[j].descripcion;
                    }
                }
            } else {
                categRec = await Categoria.findById(Receta[i].categoria);
                Receta[i].categoria = categRec.descripcion;
            }
            var owenReceta = await Users.findById(Receta[i].owen);
            Receta[i].owen = owenReceta.username;
            Receta[i].owenImg = owenReceta.thumbnail;
            const calificacionesProm = await Calificacion.find({
                id_receta: Receta[i]._id
            });
            var totalCal = 0
            for (let i = 0; i < calificacionesProm.length; i++) {
                totalCal = totalCal + calificacionesProm[i].calificacion;
            }
            var promCal = totalCal / calificacionesProm.length;
            Receta[i].calificacion = promCal;
        }
        
        
        var allCat = await Categoria.find()
        res.render("recetas/recetas-categoria", {
            allCat,
            Receta,
            cat,
            user: req.user
        });
    }
})
 //------------------------------------- FAVORITOS ---------------------------------------------------------

router.get('/recetas/favoritos/:id', async (req, res) => { //lista favoritos
    if (req.user) {
        const favoritos = await Favoritos.findOne({id_usuario : req.user.id})
        var favPrev = 0;
        
        favoritos.id_favoritos.forEach(fav => {
            if (fav == req.params.id) {
                favPrev = 1
            }
        });
        if (favPrev == 0) {
            await Favoritos.findOneAndUpdate({id_usuario : req.user.id},{
                $push : {id_favoritos: req.params.id}
            })
            //res.send(`<script>alert("Calificacion de la receta completada"); window.location.href = "/recetas/ver/${req.params.id}"</script>`);
            res.send(`<script> window.location.href = "/recetas/ver/${req.params.id}"</script>`);
        }else{
            //res.send(`<script>alert("Ya ha calificado anteriormente esta receta"); window.location.href = "/recetas/ver/${req.params.id}"</script>`);
            res.send(`<script> window.location.href = "/recetas/ver/${req.params.id}"</script>`);
        }
    }else{
        //res.send(`<script>alert("Logueate"); window.location.href = "/recetas/ver/${req.params.id}"</script>`);
        res.send(`<script> window.location.href = "/recetas/ver/${req.params.id}"</script>`);
    }
})

router.get('/recetas/favoritos', async (req, res) => {                    //lista favoritos
    if (req.user) {
        const favoritos = await Favoritos.findOne({id_usuario : req.user.id})
        
        
        var recetasFinal = []

        for (let i = 0; i < favoritos.id_favoritos.length; i++) {
            const recetaFav = await Recetas.findById(favoritos.id_favoritos[i]);
            
            
            if (recetaFav) {
                recetasFinal.push(recetaFav);
            }else{
                await Favoritos.update( {id_usuario : req.user.id}, { $pullAll: {id_favoritos: [favoritos.id_favoritos[i]] } } )
                var updFavoritos = await Favoritos.findOne({id_usuario : req.user.id})
                
                

            }
        }
        if (recetasFinal) {
            for (let i = 0; i < recetasFinal.length; i++) {
                var categRec;
                if (recetasFinal[i].subcategoria) {
                    categRec = await Categoria.findById(recetasFinal[i].padre);
                    for (let j = 0; j < categRec.subcategorias.length; j++) {
                        if (recetasFinal[i].categoria == categRec.subcategorias[j]._id) {
                            recetasFinal[i].categoria = categRec.subcategorias[j].descripcion;
                        }
                    }
                } else {
                    categRec = await Categoria.findById(recetasFinal[i].categoria);
                    recetasFinal[i].categoria = categRec.descripcion;
                }
                var owenReceta = await Users.findById(recetasFinal[i].owen);
                recetasFinal[i].owen = owenReceta.username;
                recetasFinal[i].owenImg = owenReceta.thumbnail;
                const calificacionesProm = await Calificacion.find({
                    id_receta: recetasFinal[i]._id
                });
                var totalCal = 0
                for (let i = 0; i < calificacionesProm.length; i++) {
                    totalCal = totalCal + calificacionesProm[i].calificacion;
                }
                var promCal = totalCal / calificacionesProm.length;
                recetasFinal[i].calificacion = promCal;
            }
            
            
            var allCat = await Categoria.find()
            res.render('recetas/favoritos', {
                allCat,
                receta: recetasFinal,
                user: req.user,
            })
        } else {
            var allCat = await Categoria.find()
            res.render('recetas/favoritos', {
                allCat,
                user: req.user
            })
        }
    }else{
        //res.send(`<script>alert("Logueate"); window.location.href = "/recetas/ver/${req.params.id}"</script>`);
        res.send(`<script>window.location.href = "/recetas/ver/${req.params.id}"</script>`);
    }
})

module.exports = router;