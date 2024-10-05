import { v2 as cloudinary } from "cloudinary";
import fs from "fs"
import dotenv from "dotenv";
dotenv.config();

console.log(process.env.CLOUDINARY_API_SECRET)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY,                 //624534957449732, 
    api_secret: process.env.CLOUDINARY_API_SECRET
})

const uploadOnCloudinary = async (localFilePath)=>{
    try{
        // console.log(process.env.CLOUDINARY_API_KEY);
        if(!localFilePath)return null;
        //upload
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type:"auto"
        })
        //uploaded
        console.log("file is uploaded on cloudinary", response)
        fs.unlinkSync(localFilePath)
        return response;

    }
    catch(error){
        fs.unlinkSync(localFilePath);
        // console.log("here")
        console.log("error while uploading file on cloudinary", error);
        return null;
    }
}

export {uploadOnCloudinary}