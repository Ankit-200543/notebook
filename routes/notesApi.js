const express=require('express')
const router=express.Router();
const Note = require('../models/notes.model'); 
const authMiddleware = require("../util/authMiddleware");










router.post('/createNotes', authMiddleware, async (req,res)=>{
const { title, content } = req.body;
try{
    const newNote = await Note.create({
            title: title,
            content: content || "hello this is my first Note",
            user: req.user.email
        })
    res.status(201).json({
    success: true,
    message: "Note created successfully",
    data: newNote
})

}

catch(error){
    res.status(500).json({
        success:false,
        message:"Internal server Error",
        error:error.message
    })
}






})
router.get('/viewNotes',authMiddleware,async (req,res)=>{

 try{
const AllNotes = await Note.find({
  user: req.user.email
}).select("title content user createdAt");
if(!AllNotes || AllNotes.length==0){
    return res.status(404).json({
        success:false,
        message:"No notes found for this user"
    })
}
res.status(200).json({
    success:true,
    count:AllNotes.length,
    data:AllNotes
})
 }
 catch(error){
    res.status(500).json({
        success:false,
        message:'internal server error ',
        error:error.message
    })

 }
  
})
router.get('/viewNote/:id', authMiddleware, async (req, res) => {
    const noteId = req.params.id;
    const userEmail = req.user.email;
    try {
        const note = await Note.findById(noteId);
        if (!note) {
            return res.status(404).json({
                success: false,
                message: "Note not found"
            });
        }
        if (note.user !== userEmail) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to view this note"
            });
        }
        res.status(200).json({
            success: true,
            data: note
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
});
router.put('/updateNotes/:id', authMiddleware, async (req, res) => {
    const noteId = req.params.id;
    const updateData = req.body.content;
    const userEmail = req.user.email;
    try {
        const note = await Note.findById(noteId)
        if(!note){
            return res.status(404).json({
                success:false,
                message:"Note not found"
            })
        }
        if(note.user !== userEmail){
            return res.status(403).json({
                success:false,
                message:"You are not authorized to update this note"
            })
        }
        const updatedNote = await Note.findByIdAndUpdate(
            noteId, 
            {$set:{content: updateData ||note.content, lastModified: Date.now()
            }},
            { new: true }
            );
        res.status(200).json({
            success:true,
            message:"Note updated successfully",
            data:updatedNote
        })
    } catch(error){
        res.status(500).json({
            success:false,
            message:"Internal server error",
            error:error.message
        })
    }
})
router.delete('/deleteNotes/:id', authMiddleware, async (req, res) => {
    const noteId = req.params.id;
    const userEmail = req.user.email;   
    try {
        const note = await Note.findById(noteId);
        if (!note) {
            return res.status(404).json({   
                success: false,
                message: "Note not found"
            });
        }   
        if (note.user !== userEmail) {
            return res.status(403).json({
                success: false, 
                message: "You are not authorized to delete this note"
            });
        }
        await Note.findByIdAndDelete(noteId);
        res.status(200).json({
            success: true,
            message: "Note deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
});


module.exports=router;