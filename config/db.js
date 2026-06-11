const mongoose = require('mongoose');

const cnn= async()=>{
    
    try{
        await mongoose.connect(process.env.MONGO_URI);
        console.log("bağlantı basarili");

    }
    catch(error){
        console.error("baglanti hatasi ",error.message);
        process.exit(1)

    }
}

const userSchema= new mongoose.Schema(
    {
        name:{
            type:String,
            required:[true,"ad soyad gir"],
            trim:true,
            min:
            max:
        }
    }
)



module.exports=cnn









