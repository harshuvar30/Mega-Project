import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { addComment, deleteComment, getAllComments, updateComment } from "../controllers/comment.controller.js";


const router = Router();

router.route('/:videoId').post(verifyJWT,addComment);
router.route('/:commentId/:videoId').patch(verifyJWT,updateComment);
router.route('/:videoId').get(verifyJWT,getAllComments);
router.route('/:commentId/:videoId').delete(verifyJWT,deleteComment)


export default router;