import {createSupabaseClient} from "./lib/client.js"

const client =createSupabaseClient()

export async function Auth(req,res,next){
    // takes the token from thr header 
    const token = req.headers.authorization
    // get the data of the user with token 
    const data = await client.auth.getUser(token)
    // extract the userId 
    const UserId = data.data.user?.id
    
    // icheck if the userId is present 
    if(UserId){

        // set the userId in request 
        req.userid = UserId
        // pass the middleware 
        next()
    }else{
        res.status(403).json({
            message:"InCorrect Input"
        })
    }

}