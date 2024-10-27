import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { likedVideos, toggleLike } from "../controllers/like.controller.js";


const router = Router();
router.use(verifyJWT)

router.route('/toggle/:type/:id').patch(toggleLike);
router.route('/video').get(likedVideos);

export default router;