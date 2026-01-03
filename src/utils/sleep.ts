export async function sleep(time: number) {
    return await new Promise(resolve => {
        setTimeout(() => {
            resolve(null)
        }, time)
    })
}