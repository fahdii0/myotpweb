export default async function handler(req: any, res: any) {
  console.log("Test endpoint called");
  return res.status(200).json({
    message: "API routing is working!",
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
}